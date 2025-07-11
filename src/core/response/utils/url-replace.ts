/**
 * Replaces attachment URLs with local file paths in text
 */
export function replaceAttachmentUrlsWithLocalPaths(
  text: string,
  attachmentUrlMap: Map<string, string>,
): string {
  let result = text;

  // Replace each attachment URL with just the filename from its corresponding local path
  attachmentUrlMap.forEach((localPath, attachmentUrl) => {
    // Extract just the filename from the local path
    const filename = localPath.split("/").pop() || localPath;

    // First handle standard URL replacements (e.g. in markdown)
    result = result.replace(new RegExp(attachmentUrl, "g"), filename);

    // Then handle HTML img tags with the URL in src attribute
    // This regex looks for src="url" or src='url' patterns
    const htmlSrcRegex = new RegExp(
      `src=["'](${escapeRegExp(attachmentUrl)})["']`,
      "g",
    );
    result = result.replace(htmlSrcRegex, `src="${filename}"`);
  });

  return result;
}

/**
 * Helper function to escape special characters in a string for use in a regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
