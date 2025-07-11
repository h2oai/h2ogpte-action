import { describe, test, expect } from "bun:test";
import { replaceAttachmentUrlsWithLocalPaths } from "../../src/core/response/utils/url-replace";
import { mockFetchDataResult } from "../resources/test-data";

describe("replaceAttachmentUrlsWithLocalPaths", () => {
  test("should replace single attachment URL with filename", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948",
        "/tmp/github-attachments/images-1eb4f910-1750826249410-0.png",
      ],
    ]);

    const input =
      "Check this image: ![screenshot](https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948)";
    const expected =
      "Check this image: ![screenshot](images-1eb4f910-1750826249410-0.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should replace multiple attachment URLs", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/image1.png", "/path/to/file1.png"],
      ["https://example.com/image2.jpg", "/path/to/file2.jpg"],
    ]);

    const input =
      "Image 1: ![img1](https://example.com/image1.png) and Image 2: ![img2](https://example.com/image2.jpg)";
    const expected =
      "Image 1: ![img1](file1.png) and Image 2: ![img2](file2.jpg)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle text with no attachment URLs", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/image.png", "/path/to/file.png"],
    ]);

    const input = "This text has no attachments";
    const expected = "This text has no attachments";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle empty attachment map", () => {
    const attachmentUrlMap = new Map<string, string>();

    const input =
      "This text has an image: ![img](https://example.com/image.png)";
    const expected =
      "This text has an image: ![img](https://example.com/image.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle paths with no file extension", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/file", "/path/to/filename"],
    ]);

    const input = "File: ![file](https://example.com/file)";
    const expected = "File: ![file](filename)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle multiple occurrences of the same URL", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/image.png", "/path/to/file.png"],
    ]);

    const input =
      "Same image twice: ![img1](https://example.com/image.png) and ![img2](https://example.com/image.png)";
    const expected =
      "Same image twice: ![img1](file.png) and ![img2](file.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle special characters in URLs", () => {
    const attachmentUrlMap = new Map([
      [
        "https://example.com/image%20with%20spaces.png",
        "/path/to/file with spaces.png",
      ],
    ]);

    const input =
      "Image: ![img](https://example.com/image%20with%20spaces.png)";
    const expected = "Image: ![img](file with spaces.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should use mock data attachment URLs", () => {
    const input =
      "Check these attachments: ![img1](https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948) and ![doc](https://github.com/user-attachments/assets/2abc123-def4-5678-90ab-cdef12345678)";
    const expected =
      "Check these attachments: ![img1](images-1eb4f910-1750826249410-0.png) and ![doc](document-2abc123-1750826249411.pdf)";

    const result = replaceAttachmentUrlsWithLocalPaths(
      input,
      mockFetchDataResult.attachmentUrlMap,
    );
    expect(result).toBe(expected);
  });

  test("should replace attachment URLs in HTML img tags", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533",
        "/tmp/github-attachments/images-5ab1099e-1750992516732-0.png",
      ],
    ]);

    const input =
      'Here is an image: <img width="1345" alt="Image" src="https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533" />';
    const expected =
      'Here is an image: <img width="1345" alt="Image" src="images-5ab1099e-1750992516732-0.png" />';

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should replace attachment URLs in HTML img tags with single quotes", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533",
        "/tmp/github-attachments/images-5ab1099e-1750992516732-0.png",
      ],
    ]);

    const input =
      "Here is an image: <img width='1345' alt='Image' src='https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533' />";
    const expected =
      "Here is an image: <img width='1345' alt='Image' src='images-5ab1099e-1750992516732-0.png' />";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle both HTML tags and markdown in the same text", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533",
        "/tmp/github-attachments/images-5ab1099e-1750992516732-0.png",
      ],
    ]);

    const input =
      'Markdown: ![Image](https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533) and HTML: <img width="1345" alt="Image" src="https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533" />';
    const expected =
      'Markdown: ![Image](images-5ab1099e-1750992516732-0.png) and HTML: <img width="1345" alt="Image" src="images-5ab1099e-1750992516732-0.png" />';

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle multiple different attachments in HTML tags", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533",
        "/tmp/github-attachments/images-5ab1099e-1750992516732-0.png",
      ],
      [
        "https://github.com/user-attachments/assets/18645b29-c38c-4a59-9781-5aad92a2f1fb",
        "/tmp/github-attachments/images-18645b29-1751000723299-0.png",
      ],
    ]);

    const input =
      '<img width="1345" alt="Image1" src="https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533" /> and <img width="1345" alt="Image2" src="https://github.com/user-attachments/assets/18645b29-c38c-4a59-9781-5aad92a2f1fb" />';
    const expected =
      '<img width="1345" alt="Image1" src="images-5ab1099e-1750992516732-0.png" /> and <img width="1345" alt="Image2" src="images-18645b29-1751000723299-0.png" />';

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });
});
