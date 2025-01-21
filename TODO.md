# Notatki Techniczne

Komentarze Koncepcyjne

Z punktu widzenia raportu, może być wygodne linkować dowolną wartość raportu z dowolną wartością faktury. To może ułatwić wyrażenie stawek typu flat rate, marży na developerze itd. Przydatne może być także tzw. clarification w sytuacjach, gdy nie występuje jednoznaczna relacja między raportem a fakturą, np. licencja na oprogramowanie.

Dzięki temu da się budować elastyczne modele rozliczeniowe (billing models), gdzie każdy kontraktor ma własny wzór naliczania, np. stawkę godzinową w raporcie oraz inną stawkę (marżę) w fakturze:
• Przykład 1:
reportValue = liczba godzin × 40/h,
billingValue = liczba godzin × 80/h.
• Przykład 2 (marża):
reportValue = liczba godzin × 40/h,
billingValue = (liczba godzin × 120%) × 40/h.

Można też w ten sposób obsługiwać sytuacje z różnymi walutami (np. podwykonawca pracuje za 120 PLN/h, a klient płaci 30 EUR/h). Taki sam mechanizm sprawdza się przy kosztach powiązanych z raportami (koszty vs raport).

Przykład rozliczenia z flat rate i różnymi stawkami

Wyobraźmy sobie, że AdamW pracuje 10 godzin × 80 EUR/h, a AdamB jest na urlopie. Wtedy AdamW dostaje 400 EUR (jego koszt), faktura wynosi 800 EUR. W przypadku dopasowywania do raportu może się okazać, że pozostałe 400 EUR ma być przypisane np. do innego raportu AdamaB. Jeżeli raporty i faktury są linkowane pojedynczą wartością, może być to skomplikowane. Jeśli jednak link ma dwie wartości (reportValue i billingValue), można wyraźnie wskazać, że np.:
• AdamW: reportValue 40 EUR, billingValue 80 EUR,
• AdamB: reportValue 115 EUR, billingValue 80 EUR.

Wówczas faktura może wynosić 160 EUR, a raporty sumarycznie 115 + 80 EUR. Z perspektywy kontraktora AdamB generuje 115 EUR w raporcie, a z perspektywy faktury to 80 EUR.

Sytuacja faktury “z wyprzedzeniem”

Może się zdarzyć, że firma wystawia fakturę przed terminem (np. w grudniu ubiegłego roku), z zawyżoną kwotą, np. 2000 EUR. Raport AB ma wartość (115×10) = 1150 EUR, z czego naliczono klientowi 800 EUR, a raport AW to (40×10) = 400 EUR, naliczono klientowi 800 EUR. Jeśli wszystko podłączymy, raporty wyglądają na “zaspokojone” ( satisfied ), ale na fakturze wciąż jest 2000 EUR. Realnie łączna wartość raportów to 1600 EUR, a faktura jest na 2000 EUR. Możemy wprowadzić tzw. clarification na poziomie 50 EUR (by pokazać, że raporty to 1550, 1600, czy inna wyliczona suma), a reszta pozostaje unmatched (np. 400 EUR na fakturze). Wiele kolejnych dopięć (podłączeń) może stać się nieczytelnych.

W praktyce lepiej, by link faktycznie zawierał dwie wartości:
• report (ile raport wypracował z perspektywy kontraktora),
• billing (ile doliczono na fakturze).

Ilustracja
• Faktura: 2000 EUR
• Raport AB:
• report = 1150 EUR
• charge (dla klienta) = 800 EUR
• Raport AW:
• report = 400 EUR
• charge = 800 EUR
• Unmatched: 400 EUR

W tej sytuacji:
• Raport AW nie ma długu (400 EUR report vs 800 EUR charge).
• Raport AB ma dług 350 EUR (1150 - 800).
• Firma ma zysk 400 EUR i może zdecydować, jak go podzielić (np. 350 EUR do AdamaB, 50 EUR zostaje w firmie).
• Jeśli jest jeszcze inny kontraktor z długiem 1000 EUR, to te 400 EUR można podzielić proporcjonalnie.

Dalsze przemyślenia

Nie ma większego sensu oznaczać w systemie, że dana nadwyżka z faktury poszła na konkretny inny raport lub że dany dług jest spłacony z innej faktury. Tak naprawdę istnieje tylko pewna pula liczbowa per klient:

1. Skupiamy się na bieżących należnościach – ile można rozdzielić z danej faktury na dane raporty.
2. Później wszystko trafia do “puli ogólnej”.

W widoku raportu można pokazać, że dany raport nie został w pełni opłacony z konkretnej faktury, ale nie ma sensu przedstawiać, w jakim stopniu – bo z perspektywy globalnej ważne jest, że dług ogólny jest jeden na klienta. Można np. w kolumnie raportu pokazać procentowy wskaźnik lub ogólną wartość długu. Lepiej natomiast rozwijać dedykowany widok kontraktorów i tam prezentować np. łączny dług kontraktora.

Wszystkie linki między raportami a billingami służą do tego, aby precyzować, ile dany kontraktor powinien dostać natychmiast. Jeśli natomiast linki kosztów do raportu są “niedoreprezentowane”, oznacza to, że workspace ma rzeczywisty dług (np. nie może zapłacić VAT z bieżącego konta).

Nie wydaje się, aby kiedykolwiek potrzebne było śledzenie, że niedobór w raporcie X został spłacony z “zysku” z raportu/faktury Y. W praktyce wystarczy rozumieć, że mamy globalną pulę środków na danego klienta.

Clarification a flat rate

Być może lepiej używać analogicznych linków (cost-report) z polami reportAmount i billingAmount, np. 40 EUR (koszt Adama) to 80 EUR na fakturze, 115 EUR (koszt AdamaB) to 80 EUR na fakturze. Wtedy ewentualne clarifications to raczej rabat lub dodatkowe koszty, np. podróży.

Zadania Ukończone (DONE)
• Custom variables – możliwość definiowania zmiennych per kontraktor, per klient, per workspace (np. stawka godzinowa, flat rate itp.).
• Możliwość odwoływania się do tych zmiennych w modelu raportu.
• Hard link raportu do zmiennych (new page) – tworzenie nowych powiązań, np. generowanie linku do raportu TMetric na podstawie zmiennych zdefiniowanych w workspace.

Zadania do Wykonania (TODO)

1. Asysta przy wpisywaniu formularza (variables)
   • Przykładowo: przeliczanie raportu godzinowego przy użyciu pluginów (wybór raportu, automatyczne obliczenie wartości EUR, itp.).
   • Można to rozwiązać bardziej generycznie, np. wybór raportu, decyzja co zrobić z wynikiem (skopiować, wprowadzić w pole, otworzyć URL).
   • Jeden z pluginów mógłby wykonywać wywołanie API do TMetric.
2. Sortowanie kolumn
   • Umożliwienie sortowania w interfejsie według wybranych pól (np. daty, kontraktora, kwoty).
3. Tworzenie faktury w trybie draft (nowa kolumna charge) na podstawie zaznaczonych raportów
   • Automatyczne pobieranie domyślnych wartości z raportów.
4. Tworzenie faktury w trybie draft (nowa kolumna cost) na podstawie zaznaczonych raportów
   • Analogicznie do punktu wyżej, w tym również integracja z custom variables (np. raport TMetric).
5. Ładne “query toolbary” – edytowalne listy i wyszukiwanie “inline”.
6. Zarządzanie użytkownikami (role, uprawnienia itp.).
7. Zarządzanie workspace’ami.
8. Kontrola widoczności nowo dodanych raportów – automatyczne ustawianie, aby raport wyświetlał się w odpowiednim kliencie/workspace.
9. Statystyki – np. ile firma jest “na plusie” (wartości faktur netto - powiązane raporty, suma billingAmount) i ile jest jeszcze długu (raporty - koszty).
10. Wyświetlanie zysku spółki na danej fakturze – np. 2×80 EUR to 160 EUR, z czego koszty to 40 + 115 + 5 (zysk) itd.
11. Rozliczanie kosztów – gdy dodajemy nowy koszt, łączyć go z raportem i wizualnie zaznaczać, czy raport został w pełni opłacony.
12. Clarify kosztów (gdy koszt nie jest powiązany z konkretnym kontraktorem, albo to inny rodzaj kosztu) – można wprowadzić statusy jak clarified vs matched + kolumna clarified.
13. Widok kontraktora – prezentujący jego zarobki, raporty, stan rozliczenia (czy koszty zostały całkowicie pokryte, a raporty opłacone). Możliwe zestawienie ciągłości raportów dla klienta.
14. Linkowanie raportów do faktur draft (charge i cost) – opcja automatycznego powiększenia kwoty faktury o wartość linka.
15. Widok billingów – kolumna wskazująca, ile firma traci, a ile zarabia w stosunku do podłączonych kosztów.
16. Lista kontraktorów z możliwością symulacji „Mam X środków w firmie, jak je rozdzielić, by spłacić długi sprawiedliwie?”.
17. Flow stream chart – reprezentacja przepływów w formie wykresu.
18. System wtyczek (pluginy) i marketplace:
    • Plugin point np. “custom list action” – link do TMetric report.
    • Wtyczki, które dodają elementy do plugin pointów (akcje, nazwy zmiennych, integracje z zewnętrznymi systemami).
    • Zarządzanie zmiennymi (np. tmetricReportId, tmetricUserId) oraz podpowiedzi do wartości tych zmiennych.
    • Możliwość automatycznego przeliczania wartości w formularzu (np. wpisanie 67h43min → 7790,1 EUR).
    • Koncepcja core plugins (podstawowe integracje z env vars, expressions).
    • Generowanie linku między raportem a billingiem (funkcja konwertująca wartości raport/billing).
19. Różnica między plugin a addon – addon może rejestrować wiele pluginów, a plugin jest pojedynczym elementem.
20. Wykres osi czasu – prezentujący faktury i raporty w jednym widoku.

Dodatkowe Uwagi
• Rozważana jest metoda scalania nadwyżek z faktur i długów raportów w formie wspólnej puli dla każdego klienta.
• Clarification jest rozpatrywane głównie tam, gdzie występują rozbieżności między sumą raportów a kwotą wystawioną na fakturze.
• Zalecane jest raczej używanie dwuwartościowych linków (reportValue, billingValue) zamiast jednowartościowych.
• W planach jest rozbudowany system wtyczek (pluginów) pozwalający automatyzować m.in. pobieranie danych z TMetric i przeliczanie różnych stawek (np. stawka godzinowa, marże, flat rate).

TODO:

- Dla każdego linka można by jakoś zdefiniować funkcję konwertującą, aby przy każdorazowej aktualizacji linka, ją wykonać, oraz wyświetlić to.
