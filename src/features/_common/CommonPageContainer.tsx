import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator,} from "@/components/ui/breadcrumb.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {SidebarTrigger} from "@/components/ui/sidebar.tsx";
import {Fragment, PropsWithChildren, ReactNode} from "react";

/**
 * Experimental
 * todo: break this down into smaller components
 * @param props
 * @constructor
 */
export function CommonPageContainer(
  props: PropsWithChildren<{
    segments: ReactNode[];
    tools?: ReactNode;
  }>,
) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {props.segments.map((segment, index) => (
                <Fragment key={index}>
                  <BreadcrumbItem
                    className={
                      index === props.segments.length - 1
                        ? ""
                        : "hidden md:block"
                    }
                  >
                    {segment}
                  </BreadcrumbItem>
                  {index < props.segments.length - 1 && (
                    <>
                      <BreadcrumbSeparator className="hidden md:block" />
                    </>
                  )}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1" />
          {props.tools && (
            <div className="flex items-center gap-2 justify-self-end">
              {props.tools}
            </div>
          )}
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">{props.children}</div>
    </>
  );
}
