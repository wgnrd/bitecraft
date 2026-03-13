import { normalizeRecipe } from '$lib/storage';
import type { Recipe } from '$lib/types';

const SHARE_PARAM = 'recipe';
const MAX_SHARE_PAYLOAD_LENGTH = 4000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64Url = (bytes: Uint8Array): string => {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
	const binary = atob(`${normalized}${padding}`);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
};

const compressText = async (value: string): Promise<Uint8Array> => {
	if (typeof CompressionStream === 'undefined') {
		return textEncoder.encode(value);
	}

	const stream = new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
};

const decompressText = async (bytes: Uint8Array): Promise<string> => {
	if (typeof DecompressionStream === 'undefined') {
		return textDecoder.decode(bytes);
	}

	const copy: Uint8Array<ArrayBuffer> = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip'));
	return textDecoder.decode(await new Response(stream).arrayBuffer());
};

export const getSharedRecipeParam = (): string => SHARE_PARAM;

export const encodeSharedRecipe = async (recipe: Recipe): Promise<string> => {
	const json = JSON.stringify(recipe);
	const compressed = await compressText(json);
	const payload = bytesToBase64Url(compressed);

	if (payload.length > MAX_SHARE_PAYLOAD_LENGTH) {
		throw new Error('Recipe is too large to share as a link.');
	}

	return payload;
};

export const decodeSharedRecipe = async (payload: string): Promise<Recipe | null> => {
	try {
		const bytes = base64UrlToBytes(payload);
		const json = await decompressText(bytes);
		return normalizeRecipe(JSON.parse(json));
	} catch {
		return null;
	}
};
