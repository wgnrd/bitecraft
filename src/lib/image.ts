const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

const escapeSvgText = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const blobToDataUrl = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
		reader.onloadend = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
				return;
			}

			reject(new Error('Failed to convert blob to data URL.'));
		};
		reader.readAsDataURL(blob);
	});

const fetchAsDataUrl = async (url: string): Promise<string> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Image request failed with ${response.status}.`);
	}

	return blobToDataUrl(await response.blob());
};

const copyComputedStyles = (source: HTMLElement, target: HTMLElement) => {
	const computed = window.getComputedStyle(source);
	const cssText = Array.from(computed)
		.map((property) => `${property}: ${computed.getPropertyValue(property)};`)
		.join(' ');

	target.setAttribute('style', cssText);
};

const cloneNodeForExport = async (source: Element): Promise<Element> => {
	const clone = source.cloneNode(false) as Element;

	if (source instanceof HTMLElement && clone instanceof HTMLElement) {
		copyComputedStyles(source, clone);
	}

	if (source instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
		const currentSrc = source.currentSrc || source.src;
		if (currentSrc) {
			try {
				clone.src = await fetchAsDataUrl(currentSrc);
			} catch {
				throw new Error(
					'The image source blocks copying. Use an image URL that allows cross-origin access or remove the hero image.'
				);
			}
		}
	}

	for (const child of Array.from(source.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			clone.appendChild(document.createTextNode(child.textContent ?? ''));
			continue;
		}

		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}

		clone.appendChild(await cloneNodeForExport(child as Element));
	}

	return clone;
};

const createSvgDataUrl = async (node: HTMLElement): Promise<string> => {
	const rect = node.getBoundingClientRect();
	const clonedNode = await cloneNodeForExport(node);
	const serializedNode = new XMLSerializer().serializeToString(clonedNode);
	const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
	svg.setAttribute('xmlns', SVG_NAMESPACE);
	svg.setAttribute('xmlns:xlink', XLINK_NAMESPACE);
	svg.setAttribute('width', `${Math.ceil(rect.width)}`);
	svg.setAttribute('height', `${Math.ceil(rect.height)}`);
	svg.setAttribute('viewBox', `0 0 ${Math.ceil(rect.width)} ${Math.ceil(rect.height)}`);

	const foreignObject = document.createElementNS(SVG_NAMESPACE, 'foreignObject');
	foreignObject.setAttribute('width', '100%');
	foreignObject.setAttribute('height', '100%');
	foreignObject.innerHTML = serializedNode;
	svg.appendChild(foreignObject);

	const serializedSvg = new XMLSerializer().serializeToString(svg);
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`;
};

const dataUrlToImage = (dataUrl: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.decoding = 'async';
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('Failed to rasterize recipe card.'));
		image.src = dataUrl;
	});

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
	new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) {
				resolve(blob);
				return;
			}

			reject(new Error('Failed to create PNG image.'));
		}, 'image/png');
	});

export const copyElementImageToClipboard = async (node: HTMLElement): Promise<void> => {
	if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
		throw new Error('Image clipboard is not available in this browser.');
	}

	if ('fonts' in document) {
		await document.fonts.ready;
	}

	const rect = node.getBoundingClientRect();
	if (!rect.width || !rect.height) {
		throw new Error('The recipe preview is not visible yet.');
	}

	const svgDataUrl = await createSvgDataUrl(node);
	const image = await dataUrlToImage(svgDataUrl);
	const canvas = document.createElement('canvas');
	const scale = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.ceil(rect.width * scale);
	canvas.height = Math.ceil(rect.height * scale);

	const context = canvas.getContext('2d');
	if (!context) {
		throw new Error('Canvas is not available in this browser.');
	}

	context.scale(scale, scale);
	context.drawImage(image, 0, 0, rect.width, rect.height);

	const blob = await canvasToBlob(canvas);
	await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
};
