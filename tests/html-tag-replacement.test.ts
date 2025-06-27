import { describe, test, expect } from "bun:test";
import { replaceAttachmentUrlsWithLocalPaths } from "../src/core/data/formatter";

describe("HTML tag attachment replacement", () => {
  test("should replace attachment URLs in HTML img tags", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533",
        "/tmp/github-attachments/images-5ab1099e-1750992516732-0.png",
      ],
    ]);

    const input = 'Here is an image: <img width="1345" alt="Image" src="https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533" />';
    const expected = 'Here is an image: <img width="1345" alt="Image" src="images-5ab1099e-1750992516732-0.png" />';

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

    const input = "Here is an image: <img width='1345' alt='Image' src='https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533' />";
    const expected = 'Here is an image: <img width=\'1345\' alt=\'Image\' src="images-5ab1099e-1750992516732-0.png" />';

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

    const input = 'Markdown: ![Image](https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533) and HTML: <img width="1345" alt="Image" src="https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533" />';
    const expected = 'Markdown: ![Image](images-5ab1099e-1750992516732-0.png) and HTML: <img width="1345" alt="Image" src="images-5ab1099e-1750992516732-0.png" />';

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

    const input = '<img width="1345" alt="Image1" src="https://github.com/user-attachments/assets/5ab1099e-11a2-476a-b826-51c1fc24f533" /> and <img width="1345" alt="Image2" src="https://github.com/user-attachments/assets/18645b29-c38c-4a59-9781-5aad92a2f1fb" />';
    const expected = '<img width="1345" alt="Image1" src="images-5ab1099e-1750992516732-0.png" /> and <img width="1345" alt="Image2" src="images-18645b29-1751000723299-0.png" />';

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });
});
