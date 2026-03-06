import clsx from "clsx";
import { useState } from "react";

interface MorphicNavbarProps {
  items?: {
    path: string;
    name: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  }[];
  activePath?: string;
}

const defaultItems = [
  { path: "/", name: "home" },
  { path: "/nearby", name: "nearby" },
];

export function MorphicNavbar({
  items = defaultItems,
  activePath: controlledActive,
}: MorphicNavbarProps) {
  const [internalActive, setInternalActive] = useState(items[0]?.path ?? "/");
  const activePath = controlledActive ?? internalActive;

  const isActiveLink = (path: string) => {
    if (path === "/") return activePath === "/";
    return activePath.startsWith(path);
  };

  return (
    <nav className="px-4 py-2">
      <div className="flex items-center justify-center">
        <div className="glass flex items-center justify-between overflow-hidden rounded-xl">
          {items.map(({ path, name, icon, onClick }, index, array) => {
            const isActive = isActiveLink(path);
            const prevPath = index > 0 ? array[index - 1].path : null;
            const nextPath =
              index < array.length - 1 ? array[index + 1].path : null;
            const isFirst = index === 0;
            const isLast = index === array.length - 1;

            return (
              <a
                key={path}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setInternalActive(path);
                  onClick?.();
                }}
                className={clsx(
                  "flex items-center gap-1.5 justify-center bg-muted p-1.5 px-3 text-sm text-muted-foreground transition-all duration-300",
                  isActive
                    ? "mx-2 rounded-xl font-semibold bg-card text-foreground"
                    : clsx(
                        (isActiveLink(prevPath ?? "") || isFirst) &&
                          "rounded-l-xl",
                        (isActiveLink(nextPath ?? "") || isLast) &&
                          "rounded-r-xl",
                      ),
                )}
              >
                {icon && <span className="shrink-0 opacity-80">{icon}</span>}
                {name}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default MorphicNavbar;
