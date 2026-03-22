"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar.tsx";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";

function navUrlMatches(pathname: string, patternBase: string): boolean {
  if (patternBase === "#") {
    return false;
  }
  return (
    matchPath({ path: `${patternBase}/*`, end: false }, pathname) !== null ||
    matchPath({ path: patternBase, end: true }, pathname) !== null
  );
}

function NavMainCollapsible({
  item,
  pathname,
}: {
  item: {
    title: string;
    url: string;
    icon?: LucideIcon;
    items?: { title: string; url: string }[];
  };
  pathname: string;
}) {
  const sectionMatches = useMemo(() => {
    if (navUrlMatches(pathname, item.url)) {
      return true;
    }
    return item.items?.some((sub) => navUrlMatches(pathname, sub.url)) ?? false;
  }, [item.items, item.url, pathname]);

  const [open, setOpen] = useState(sectionMatches);
  const prevSectionMatches = useRef(sectionMatches);
  useEffect(() => {
    if (sectionMatches) {
      setOpen(true);
    } else if (prevSectionMatches.current) {
      setOpen(false);
    }
    prevSectionMatches.current = sectionMatches;
  }, [sectionMatches]);

  const parentActive = navUrlMatches(pathname, item.url);

  return (
    <Collapsible
      asChild
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={parentActive}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={navUrlMatches(pathname, subItem.url)}
                >
                  <Link to={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const location = useLocation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainCollapsible
            key={item.title}
            item={item}
            pathname={location.pathname}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
