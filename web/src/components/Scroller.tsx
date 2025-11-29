import React from "react";
import "./Scroller.scss";

export const Scroller = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
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