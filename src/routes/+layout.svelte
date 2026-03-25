<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href={favicon} />
	<meta name="theme-color" content="#ea580c" />
	<meta name="application-name" content="BiteCraft" />
	<meta name="apple-mobile-web-app-title" content="BiteCraft" />
</svelte:head>

{@render children()}
