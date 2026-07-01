// Share a bar via the Web Share API, falling back to clipboard.
export async function shareBar(bar) {
  const url = `${location.origin}/bar/${bar.id}`;
  const data = {
    title: `${bar.name} · rabar`,
    text: `Scopri ${bar.name} su rabar`,
    url,
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
