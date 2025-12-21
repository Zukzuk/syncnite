import { forwardRef, HTMLProps } from "react";

export const Scroller = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  (props, ref) => (
    <div
      {...props}
      ref={ref}
      style={{
        ...props.style,
        overflowY: "scroll",
        scrollbarGutter: "stable right-edge",
      }}
    />
  )
);
Scroller.displayName = "Scroller";