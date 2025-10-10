import { cn } from "@/utils/cn";
import type { IconProps } from "./types";
import type { JSX } from "react";

const VIEW_BOX = "0 0 24 24";

const createFilledIcon = (
  renderContent: () => JSX.Element
): ((props: IconProps) => JSX.Element) => {
  return ({ size = 24, ...rest }: IconProps) => (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      width={size}
      height={size}
      fill="currentColor"
      {...rest}
    >
      {renderContent()}
    </svg>
  );
};

export const ReplyIcon = createFilledIcon(() => (
  <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
));

export const RetweetIcon = createFilledIcon(() => (
  <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
));

export const LikeIcon = createFilledIcon(() => (
  <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
));

export const LikeActiveIcon = createFilledIcon(() => (
  <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
));

export const ViewIcon = createFilledIcon(() => (
  <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
));

export const BookmarkIcon = createFilledIcon(() => (
  <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z" />
));

export const BookmarkActiveIcon = createFilledIcon(() => (
  <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
));

export const LikeAnimationIcon = ({
  size,
  className,
  ...rest
}: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("like-animation", className)}
      {...rest}
    >
      <path
        id="empty-heart"
        fill="currentcolor"
        d="M 36.697 25.169 C 35.475 25.109 34.018 25.679 32.807 27.329 L 32.002 28.419 L 31.196 27.329 C 29.984 25.679 28.526 25.109 27.304 25.169 C 26.061 25.239 24.955 25.949 24.394 27.079 C 23.842 28.199 23.761 29.859 24.873 31.899 C 25.947 33.869 28.13 36.169 32.002 38.509 C 35.872 36.169 38.054 33.869 39.128 31.899 C 40.239 29.859 40.158 28.199 39.605 27.079 C 39.044 25.949 37.939 25.239 36.697 25.169 Z M 40.884 32.859 C 39.533 35.339 36.883 37.979 32.505 40.529 L 32.002 40.829 L 31.498 40.529 C 27.119 37.979 24.469 35.339 23.116 32.859 C 21.756 30.359 21.706 27.999 22.602 26.189 C 23.489 24.399 25.249 23.279 27.203 23.179 C 28.854 23.089 30.571 23.739 32.001 25.189 C 33.43 23.739 35.147 23.089 36.797 23.179 C 38.751 23.279 40.511 24.399 41.398 26.189 C 42.294 27.999 42.244 30.359 40.884 32.859 Z"
      />
      <g id="Group" fill="none" fill-rule="evenodd">
        <path
          d="M 40.884 32.859 C 39.533 35.339 36.883 37.979 32.505 40.529 L 32.002 40.829 L 31.498 40.529 C 27.119 37.979 24.469 35.339 23.116 32.859 C 21.756 30.359 21.706 27.999 22.602 26.189 C 23.489 24.399 25.249 23.279 27.203 23.179 C 28.854 23.089 30.571 23.739 32.001 25.189 C 33.43 23.739 35.147 23.089 36.797 23.179 C 38.751 23.279 40.511 24.399 41.398 26.189 C 42.294 27.999 42.244 30.359 40.884 32.859 Z"
          id="heart"
          opacity="0"
          fill="currentcolor"
        />
        <circle
          id="main-circ"
          fill="#E2264D"
          opacity="0"
          cx="32"
          cy="32"
          r="1.5"
        />
        <g id="grp7" opacity="0" transform="matrix(1, 0, 0, 1, 10, 9.5)">
          <circle id="oval1" fill="#9CD8C3" cx="2" cy="6" r="2"></circle>
          <circle id="oval2" fill="#8CE8C3" cx="5" cy="2" r="2"></circle>
        </g>
        <g id="grp6" opacity="0" transform="matrix(1, 0, 0, 1, 3, 31.5)">
          <circle id="oval1" fill="#CC8EF5" cx="2" cy="7" r="2"></circle>
          <circle id="oval2" fill="#91D2FA" cx="3" cy="2" r="2"></circle>
        </g>
        <g id="grp3" opacity="0" transform="matrix(1, 0, 0, 1, 55, 31.5)">
          <circle id="oval2" fill="#9CD8C3" cx="2" cy="7" r="2"></circle>
          <circle id="oval1" fill="#8CE8C3" cx="4" cy="2" r="2"></circle>
        </g>
        <g id="grp2" opacity="0" transform="matrix(1, 0, 0, 1, 47, 9.5)">
          <circle id="oval2" fill="#CC8EF5" cx="5" cy="6" r="2"></circle>
          <circle id="oval1" fill="#CC8EF5" cx="2" cy="2" r="2"></circle>
        </g>
        <g id="grp5" opacity="0" transform="matrix(1, 0, 0, 1, 17, 53.5)">
          <circle id="oval1" fill="#91D2FA" cx="6" cy="5" r="2"></circle>
          <circle id="oval2" fill="#91D2FA" cx="2" cy="2" r="2"></circle>
        </g>
        <g id="grp4" opacity="0" transform="matrix(1, 0, 0, 1, 38, 53.5)">
          <circle id="oval1" fill="#F48EA7" cx="6" cy="5" r="2"></circle>
          <circle id="oval2" fill="#F48EA7" cx="2" cy="2" r="2"></circle>
        </g>
        <g id="grp1" opacity="0" transform="matrix(1, 0, 0, 1, 27, 3.5)">
          <circle id="oval1" fill="#9FC7FA" cx="2.5" cy="3" r="2"></circle>
          <circle id="oval2" fill="#9FC7FA" cx="7.5" cy="2" r="2"></circle>
        </g>
      </g>
    </svg>
  );
};
