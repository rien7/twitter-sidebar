// import { parse } from "twemoji-parser";
import type { ReactNode } from "react";
import { parse } from "twemoji-parser";
import { cn } from "./cn";
import { decode } from "he";

interface RenderTwemojiOptions {
  className?: string;
}

const DEFAULT_IMAGE_CLASSNAME = cn(
  "inline-block h-[1.2em] w-[1.2em] align-[-20%] mx-[0.075em]"
);

/**
 * 将字符串中的 emoji 转换为 Twemoji 图像节点。
 * 返回的节点可以直接插入到 React 的 JSX 中，而无需使用 `dangerouslySetInnerHTML`。
 */
export const renderWithTwemoji = (
  value: string,
  { className }: RenderTwemojiOptions = {}
): ReactNode => {
  if (!value) return value;

  const parsed = parse(value, {
    assetType: "svg",
    buildUrl(codepoints, assetType) {
      return `https://abs-0.twimg.com/emoji/v2/svg/${codepoints}.${assetType}`;
    },
  });
  if (parsed.length === 0) {
    return decode(value);
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let i = 0;

  parsed.forEach((emoji) => {
    const [start, end] = emoji.indices;
    if (start > cursor) {
      const slice = value.slice(cursor, start);
      nodes.push(<span key={`twemoji-text-${i++}`}>{decode(slice)}</span>);
    }
    nodes.push(
      <img
        key={`twemoji-emoji-${i++}`}
        src={emoji.url}
        alt={emoji.text}
        draggable={false}
        className={className ?? DEFAULT_IMAGE_CLASSNAME}
      />
    );
    cursor = end;
  });

  if (cursor < value.length) {
    nodes.push(
      <span key={`twemoji-text-${i++}`}>{decode(value.slice(cursor))}</span>
    );
  }

  return nodes;
};
