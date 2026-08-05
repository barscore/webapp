// Copy text to the clipboard. Uses the async Clipboard API when available
// (requires a secure context), falling back to a hidden textarea +
// execCommand('copy') elsewhere. Returns true only if the copy succeeded.
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path (e.g. permission denied)
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

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
    return (await copyText(url)) ? 'copied' : 'cancelled';
  } catch {
    return 'cancelled';
  }
}
