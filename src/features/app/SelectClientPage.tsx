import { clientQueryUtils } from "@/api/clients/clients.api.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";
import { CircleArrowOutUpRight } from "lucide-react";

export function SelectClientPage(
  props: WithServices<
    [WithAuthService, WithClientService, WithLocationService]
  >,
) {
  const auth = props.services.authService.useAuth();
  const clients = props.services.clientService.useClients(
    clientQueryUtils.ofEmpty(),
  );
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="">
                <BreadcrumbPage>Select a client</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {rd
            .journey(clients)
            .wait(
              <>
                <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
                <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
                <div className="aspect-video rounded-xl bg-slate-100/50 dark:bg-slate-800/50" />
              </>,
            )
            .catch(renderError)
            .map((clients) =>
              clients.map((client) => (
                <Card className="" {...props}>
                  <CardHeader>
                    <CardTitle>{client.name}</CardTitle>
                    {/*<CardDescription>*/}
                    {/*</CardDescription>*/}
                  </CardHeader>
                  <CardContent className="grid gap-4 items-center justify-center">
                    <Avatar className="size-48">
                      {client.avatarUrl && (
                        <AvatarImage src={client.avatarUrl} alt={client.name} />
                      )}
                      <AvatarFallback>
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    {/*<div className=" flex items-center space-x-4 rounded-md border p-4">*/}
                    {/*  <BellRing />*/}
                    {/*  <div className="flex-1 space-y-1">*/}
                    {/*    <p className="text-sm font-medium leading-none">*/}
                    {/*      Push Notifications*/}
                    {/*    </p>*/}
                    {/*    <p className="text-sm text-muted-foreground">*/}
                    {/*      Send notifications to device.*/}
                    {/*    </p>*/}
                    {/*  </div>*/}
                    {/*  <Switch />*/}
                    {/*</div>*/}
                    <div>
                      {/*{notifications.map((notification, index) => (*/}
                      {/*  <div*/}
                      {/*    key={index}*/}
                      {/*    className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"*/}
                      {/*  >*/}
                      {/*    <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />*/}
                      {/*    <div className="space-y-1">*/}
                      {/*      <p className="text-sm font-medium leading-none">*/}
                      {/*        {notification.title}*/}
                      {/*      </p>*/}
                      {/*      <p className="text-sm text-muted-foreground">*/}
                      {/*        {notification.description}*/}
                      {/*      </p>*/}
                      {/*    </div>*/}
                      {/*  </div>*/}
                      {/*))}*/}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() =>
                        props.services.locationService.changeCurrentClientId(
                          client.id,
                        )
                      }
                    >
                      <CircleArrowOutUpRight /> Go to client
                    </Button>
                  </CardFooter>
                </Card>
              )),
            )}
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-slate-100/50 md:min-h-min dark:bg-slate-800/50" />
      </div>
    </>
  );
}
