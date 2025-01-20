import { costQueryUtils } from "@/api/cost/cost.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineCostSearch } from "@/features/_common/inline-search/InlineCostSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { assert } from "@/platform/lang/assert.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { chain, partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface ReportCostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithReportDisplayService,
      WithPreferenceService,
      WithContractorService,
      WithExpressionService,
      WithWorkspaceService,
      WithClientService,
      WithRoutingService,
    ]
  > {
  report: ReportViewEntry;
}

export function ReportCostInfo({ services, report }: ReportCostInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <TransferView
        fromAmount={report.remainingCompensationAmount}
        toAmount={report.compensatedAmount}
        // extraAmount={report.remainingFullCompensationAmount}
        fromLabel="Remaining"
        toLabel="Paid"
        // extraLabel="Compensated"
        services={services}
      />

      {report.remainingCompensationAmount.amount > 0 && (
        <div className="flex gap-2 flex-row self-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" size="xs">
                {rd
                  .fullJourney(linkingState.state)
                  .initially(<Link2 />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-4"))
                  .map(() => (
                    <Check />
                  ))}
                Find & link cost
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]">
              <PopoverHeader>Match the report with a cost entry</PopoverHeader>
              <InlineCostSearch
                className="overflow-y-auto h-full"
                showTargetValue
                showDescription
                maxSourceAmount={report.remainingFullCompensationAmount}
                services={services}
                onSelect={(data) =>
                  linkingState.track(
                    services.mutationService.linkCostAndReport({
                      costId: data.costId,
                      reportId: report.id,
                      reportAmount: data.value.source,
                      costAmount: data.value.target,
                      description: data.value.description,
                    }),
                  )
                }
                query={chain(
                  costQueryUtils.ofDefault(
                    report.workspace.id,
                    report.client.id,
                  ),
                )
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "linkedRemainder", {
                      operator: "greaterThan",
                      value: 0,
                    }),
                  )
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "contractorId", {
                      operator: "oneOf",
                      value: [report.contractor.id, null],
                    }),
                  )
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "potentialClientId", {
                      operator: "oneOf",
                      value: [report.client.id, null],
                    }),
                  ) // we want to see all costs since they may be not linked to any, or effectively linked to multiple clients
                  .thru((x) => costQueryUtils.removeFilter(x, "clientId")) // we want to see all costs since they may be not linked to any, or effectively linked to multiple clients
                  .value()}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="warning" size="xs">
                {rd
                  .fullJourney(clarifyState.state)
                  .initially(<Link2 />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-4"))
                  .map(() => (
                    <Check />
                  ))}
                Clarify
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-fit max-w-md"
              align="center"
              side="right"
            >
              <InlineBillingClarify
                maxAmount={report.remainingAmount.amount}
                services={services}
                onSelect={(data) => {
                  assert(data.linkType === "clarify");
                  assert(
                    data.reportAmount,
                    "Only report clarifications are allowed",
                  );
                  void clarifyState.track(
                    services.mutationService.linkCostAndReport({
                      reportId: report.id,
                      reportAmount: data.reportAmount,
                      description: data.description,
                      costId: null,
                      costAmount: 0,
                    }),
                  );
                }}
                context={{ reportId: report.id, billingId: -1 }} // stop reusing InlineBilingClarify for cost clarifications
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked costs
      </div>
      <Separator className="my-2" />
      <div className="space-y-2">
        {report.costLinks.map((link) => {
          function getContent() {
            if (
              maybe.isPresent(link.link.reportId) &&
              maybe.isPresent(link.link.costId)
            ) {
              return (
                <>
                  <LinkPopover
                    context={{
                      contractorId: report.contractor.id,
                      workspaceId: report.workspace.id,
                      clientId: idSpecUtils.ofAll(),
                    }}
                    services={services}
                    sourceLabel="Report amount"
                    targetLabel="Cost amount"
                    sourceCurrency={report.netAmount.currency}
                    targetCurrency={link.cost.currency}
                    title="Update linked report"
                    initialValues={{
                      source: link.link.reportAmount ?? undefined,
                      target: link.link.costAmount ?? undefined,
                      description: link.link.description,
                    }}
                    onValueChange={(_all, updates) =>
                      services.mutationService.updateCostReportLink(
                        link.link.id,
                        mapKeys(updates, {
                          source: "reportAmount",
                          target: "costAmount",
                        }),
                      )
                    }
                  >
                    <Button variant="headless" size="headless">
                      <Badge variant="positive">Cost</Badge>
                    </Button>
                  </LinkPopover>
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium leading-none flex flex-row gap-2">
                      {services.formatService.financial.amount(
                        link.link.costAmount,
                        maybe.getOrThrow(
                          link.cost?.currency,
                          "todo fix types - discriminated union?",
                        ),
                      )}
                      <div className="contents text-gray-500">
                        satisfies
                        {services.formatService.financial.amount(
                          link.link.reportAmount,
                          maybe.getOrThrow(
                            report.netAmount.currency,
                            "todo fix types - discriminated union?",
                          ),
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row gap-2">
                      <span className="text-xs text-slate-600">
                        invoiced at
                      </span>
                      <Badge variant="secondary" size="sm">
                        {services.formatService.temporal.date(
                          maybe.getOrThrow(
                            link.cost,
                            "todo fix types - discriminated union?",
                          ).invoiceDate,
                        )}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-auto">
                    <div className="text-xs text-slate-500">
                      Linking description
                    </div>
                    <SimpleTooltip title={link.link.description}>
                      <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800 p-2 bg-slate-100 rounded">
                        {maybe.getOrElse(
                          maybe.fromTruthy(link.link.description),
                          <div className="text-slate-400">No description</div>,
                        )}
                      </div>
                    </SimpleTooltip>
                    <div className="text-xs text-slate-500">
                      Cost description
                    </div>
                    {link.cost && (
                      <SimpleTooltip title={link.cost.description}>
                        <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800 p-2 bg-slate-100 rounded">
                          {maybe.getOrElse(
                            maybe.fromTruthy(link.cost.description),
                            <div className="text-slate-400">
                              No description
                            </div>,
                          )}
                        </div>
                      </SimpleTooltip>
                    )}
                  </div>
                </>
              );
            }
            return (
              <>
                <Badge variant="secondary" tone="secondary">
                  Clarification
                </Badge>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium leading-none flex flex-row gap-2">
                    {services.formatService.financial.amount(
                      link.link.reportAmount,
                      report.netAmount.currency,
                    )}
                    <div className="contents text-gray-500">is clarified</div>
                    <TruncatedMultilineText>
                      {link.link.description}
                    </TruncatedMultilineText>
                  </div>
                </div>
              </>
            );
          }

          return (
            <div
              className="flex items-center gap-2 bg-slate-50 p-1 border border-slate-200 rounded"
              key={link.link.id}
            >
              {getContent()}
              <DeleteButtonWidget
                services={services}
                onDelete={partial(
                  services.mutationService.deleteCostReportLink,
                  link.link.id,
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Ensure all costs are correctly linked to this report to maintain
        accurate financial tracking.
      </div>
    </div>
  );
}

/**
 * Z punktu widzenia raportu, może być wygodne linkować dowolną wartość raportu z dowolną wartością faktury.
 * To może łatwo wyrazić flat rate, ale też marżę na developerze, etc..
 * Może clarification też się przydać, np w przypadku gdy nie ma jednoznacznej relacji między raportem a fakturą, np licencja na oprogramowanie.
 *
 * Wtedy można zrobić fajne billingModele, gdzie każdy kontraktor ma swoj wzor: np naliczanie godzinowe, gdzie mamy reportValue = x * 40/h a billingValue = x * 80/h
 * Albo reportValue = x*40/h, a billingValue x*120% * 40/h, wtedy wszysktko da sie ladnie zamodelować.
 *
 * Daje nam to też możliwość swobodnego definiowania waluty. np podwykonawca robi 120pln/h, a my bierzemy 30eur, wtedy wsyzstko gra.
 * Tak samo jak przy koszty-vs-raport
 *
 */
/** todo: zamodelować flat rate w przypadku, gdy np AdamW pracuje 10h x 80 eur, AdamB jest na Urlopie, to AdamW dostaje po swojej stawce 400 eur, a faktura na 800 eur jest clarified
    natomiast pozostałe 400 eur jest przypisane do dawnego raportu AdamaB... to może być trudne do zamodelowania...
    skoro raporty uwzględniają stawki kontraktora, a chargowanie może być na flat rate, możliwe, że istnieje w ramach linku musi być raportValue i billingValue aby np powiedzieć, że AdamaW 40eur eur generuje 80eur eur na fakturze, a AdamaB 115 eur generuje też 80 eur na fakturze
    czyli faktura jest na 160 eur, raporty na 115 i 80 eur. Jednak z punktu widzenia billingu są rozliczone,
    i nawet nie ma clarification!
    natomiast z punktu widzenia kontraktora, to widać, że AdamB wypracował 115 eur, i z linków wynika, że

 Może się zdarzyć, że wystawimy fakturę zawczasu, np żeby była wystawiona w grudniu zeszłego roku, ale kwota np będzie zawyżona.
 Wtedy faktura będzie niezlinkowana przez jakiś czasu
 Faktura: 2000 eur (kwota z wyprzedzeniem)
 Raport AB: 115*10 = 1150 eur / charging 800
 Raport AW: 40*10 = 400 eur / charging 800

 Obecnie, jeśli podłączymy w całości, to raport AB będzie satisfied, raport AW będzie satisfied, a na fakturze musimy
 Dać clarification na poziomie 50 eur, żeby pokazać, z raportów wynika 1600 eur.
 Wtedy faktura będzie unmatched na 400 eur, a raporty będą matched na 1600 eur.
 To będzie dość nieczytelne, jeśli będziemy chcieli kolejne raport podłączać z kolejnymi clarifications?

 Lepiej, żeby faktycznie link miał dwie wartości, wtedy:
 Faktura: 2000 eur
    Raport AB: 115*10 =  report 1150, charge 800
    Raport AW: 40*10 = report 400, charge 800
    Unmatched: 400 eur
Raport AW: brak długu
Raport AB: dług 1150-800 = 350 eur
Koszt AW: 40 eur
A ponieważ firma zarabia 400 eur, to możemy wypłacić 350 eur na raport AB, a 50 eur zostaje na firmie.
Koszt AB: 800+350 = 1150 eur

 O tym, jaką kwotę dopłacić AB (np te 350) powinno się decydować na podstawie widoku kontraktorów w projekcie, i ich ogólnych długów.
 Np wtedy wydzie ze AdamB ma dług 350 eur, a AdamW nie ma długu. Albo jest jeszcze ktoś kto ma dług 1000 eur, wtedy można np rozdzielić 400 eur na (350+1000) = 135 eur dla AdamaB, 265 eur dla kogoś innego.



 */
/**
 Dodatkowe przemyslenia
 Nie ma sensu wskazywać, że dana nadwyżka z faktury poszła na jakiś tam inny raport,
 Tak samo nie ma sensu mówić, że dany dług jest spłacony z innego billingu.
 Jest to po prostu pula liczna per klient.
     Skupiamy się na "bieżących należnościach" czyli tyle ile można rozdzielić z danej faktury na dane raporty.
     Potem jest to już ogólna pula.
 Można w widoku raportu pokazywać owszem, że dany raport nie został w pełni opłacony z faktury klienta, która dotyczy raportu, ale
 nie ma sensu mówić w jakim stopniu została opłacona (gdyż dług ogólny jest jeden per klinet).
 Można więc w tej kolumnie np pokazywać np procent ogólnie lub wartość łączną długów, że dany konrachent po prostu powinien jeszcze dostawać spady jakieś.
 Co więcej, tą wartość najlepiej pokazywać w widoku kontraktorów, którego jeszcze nie ma.

 Wszystkie linki między raportami a billingami służą do tego, aby zdefiniować ile dany kontraktor powinien dostać od razu.
 Jeśli z kolei linki kosztów do raportu będą niedoreprezentowane, to znaczy, że workspace ma faktyczny dług np przez niemożliwość zapłacenia reverse charge + Vat z bieżącego konta.

 Nie wiem czy kiedykolwiek będzie konieczne, aby pokazywać, że kontraktorowi z niedoborem bill. X zapłaciliśmy z zysku z bill Y.

 W ogóle zastanawiam się, czy jest sens używać clarification w przypadku flat rate etc.
 Może powinny być analogiczne linki jak cost-repor, że jest reportAmount <-> billingAmount, np 40eur Adama to 80 euro na fakturze, a 115 eur AdamaB to 80 euro na fakturze.
 Wtedy clarification mogłoby być po prostu np jakiś rabat lub dodatkowe koszty zwrócone przez klienta, np podróży.


 */
// done: custom variables - per contrator, per client, per workspace (np stawka godzinowa, stawka flat rate, etc)
// done:  możliwość odwoływania się do tych zmiennych
// done: hard link raportu do zmiennych - new page
//.       custom linki per workspace - funkcja od zmiennych powyżej - np generowanie linku do raportu TMetric

// todo: asysta przy wpisywaniu formularza - variables
//.       - np przeliczanie raportu godznowego (plugin flow - click na idź do raportu - copy - enter 67h43min -> wpisuje sie 7790,1 eur)
//.       - można to zrobić troche bardziej generycznie, np wybierz raport, zdecyduj co zrobić z wynikiem (copy, enter field, open url)
//        - jedna z opcji pluginu to api call do tmetrica??
// todo: sortowanie kolumn!
// todo: stwórz fakturę draft (nowa kolumna) (charge) na podstawie zaznaczonych raportów (default values)
// todo: stwórz fakturę draft (nowa kolumna) (cost) na podstawie zaznaczonych raportów (default values)
//.       - tutaj też można zastosować custom variables, aby np wygenerować linki na podstawie raportu tmetric
// todo: ładne query toolbary edytowalne, w listach i inline search tez!
// todo: zarządzanie użytkownikami (role, uprawnienia, etc)
// todo: zarządzanie workspace'ami
// todo: jak dodamy nowy raport etc, to upewnijmy się że jesteśmy na kliencie/workspace, który dotyczy nowo dodanego raportu inaczej nie będzie widoczny
// można zrobić stats, gdzie mamy ile firma jest na plusie (faktura net - podłączone raporty sum billingAmount) a ile ma jeszcze długu (raporty - costy)
// todo: musimy umiec zobaczyc ze na danej fakturze jest zysk spółki, np 2x80eur daje 40+115+5(zysk) = 160 eur
// todo: jak dodamy nowy koszt, to chcemy zrobić tak, żeby był polinkowany z raportem, ale powinno być widać w UI ze raport opłacony jest!
// todo: możliwość clarify kosztów (np koszt niepowiązany z kontraktorem, koszt inny) (wtedy cost status clarified vs matched + kolumna clarified)
// todo: widok kontraktora - jego zarobki, raporty, etc (m.in widok ciągłości raportów dla każdego klienta)
//       - w tym widoku chcemy zobaczyć czy koszty Dawida zostały całkowicie rozliczone, tak samo jego raporty

// todo: linkowanie raportów do faktur draft charge - opcja powiększenia kwoty faktury o kwotę linka
// todo: linkowanie raportów do faktur draft cost - opcja powiększenia kwoty faktury o kwotę linka
// todo: w widoku billingu dać kolumnę, ile firma traci a ile zarabia (w stosunku do podłączonych kosztów)
// todo: lista kontraktorów, z możliwością opcji "mam x kasy w firmie, komu ile moge zaplacic aby sprawiedliwie podzielic"
// todo: flow stream chart
// todo: pluginy (i market place)
//  - plugin pointy: np custom list action (go to tmetric report)
//  - pluginy - dodają elementy do plugin pointów,
//    - np: custom list action:
//.     - label: "Go to TMetric report"
//.     - action: custom function
//.     - url: expression api.openPage("https://app.tmetric.com/#/reports/${await vars.tmetricReportId}/detailed?range=${await vars.startDate}-${await vars.endDate}&user=${await vars.tmetricUserId}&project=${await vars.tmetricProjectIds}&client=${await vars.clientId}&groupby=description")
//   - pluginy zarządzają custom variables (np tmetricReportId, tmetricUserId, tmetricProjectIds)
//             jakoś wpływają na to, że w variables można wybrać nazwę nie z palca tylko wskazać myPlugin.tmetricReportId = "12345"
//.  - inny plugin point - auto variables w formularzach: np wpisujesz 67h43min -> 7790,1 eur, można wskazać dla którego pola wywołujemy plugin, oraz na jakie pola wynikowe ma wpływać
//.  - ogólnie to co mamy teraz zahardcodowane (open raport, oraz button variables) - to będą plugin pointy,
//      a my będziemy mieć core plugins, które np pozwalają na użycie env vars, expressions (sam plugin point nic nie wie o envach etc - komunikuje sie z pluginami nie wiedzac co robią)
//.  - generowanie linku między raportem a billingiem - tam też będzie plugin point, i będzie plugin pozwalający na wybranie funkcji konwertującej, albo będzie plugin własny, który skonwertuje wartości bez UI
// todo: plugin vs addon - addon rejestruje wiele pluginów, plugin to jest jeden konkretny element dorzucany potem do plugin pointu
