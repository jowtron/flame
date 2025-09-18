import classes from './Icon.module.css';
import { Icon as MDIcon } from '@mdi/react';
import * as MDIcons from '@mdi/js';

interface Props {
  /** MDI icon name, e.g. "mdiPencil" */
  icon?: string;
  /** Optional direct SVG path (overrides icon name if provided) */
  iconPath?: string;
  /** CSS color value (defaults to var(--color-primary)) */
  color?: string;
  /** Extra class name(s) */
  className?: string;
  /** Explicit pixel size; when provided we set width/height in px */
  sizePx?: number;
}

export const Icon = ({
  icon,
  iconPath,
  color,
  className,
  sizePx = 32,
}: Props): JSX.Element => {
  let path = iconPath;
  if (!path && icon) {
    path = (MDIcons as any)[icon];
  }
  if (!path) {
    console.warn(`Icon not found for props: icon="${icon}"`);
    path = MDIcons.mdiCancel;
  }

  const combinedClassName = `${classes.Icon} ${className || ''}`.trim();

  return (
    <MDIcon
      path={path as string}
      color={color ?? 'var(--color-primary)'}
      className={combinedClassName}
      // Explicit pixel sizing so icons are consistent across views
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        minWidth: `${sizePx}px`,
        minHeight: `${sizePx}px`,
      }}
    />
  );
};
