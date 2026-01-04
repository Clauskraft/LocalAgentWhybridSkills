import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(props: IconProps): SVGProps<SVGSVGElement> {
  const { size, ...rest } = props;
  const wh = size ?? 18;
  return {
    width: wh,
    height: wh,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...rest,
  };
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function IconPlug(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M12 12v9" />
      <path d="M7 8h10v4a5 5 0 0 1-10 0z" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.5-2.2.7a8 8 0 0 0-1.7-1l-.3-2.3H10.7L10.4 6a8 8 0 0 0-1.7 1L6.5 6.3l-2 3.5 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.5 2.2-.7a8 8 0 0 0 1.7 1l.3 2.3h4.6l.3-2.3a8 8 0 0 0 1.7-1l2.2.7 2-3.5z" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  );
}

export function IconPaperclip(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M21 8.5 12.5 17a5 5 0 0 1-7.1-7.1l8.5-8.5a3.5 3.5 0 0 1 5 5L10 15.3a2 2 0 1 1-2.8-2.8L15.8 3.9" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconCircle(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  );
}


