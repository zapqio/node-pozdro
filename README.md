# Szablon modułu Node.js dla Zapqio

Gotowy punkt startowy dla repozytorium typu **Node** wykonywanego przez wewnętrznego runnera Zapqio.

Przykład udostępnia metodę `template-node-hello`. Przyjmuje imię w JSON, zapisuje komunikat w logu i zwraca powitanie jako tekst JSON. Działa bez dodatkowych pakietów i bez sekretów. Opcjonalnie pokazuje odczyt sekretnej stałej.

Nazwa metody jest inna niż w [szablonie Pythona](https://github.com/zapqio/internal_runner_python_template), więc oba przykłady można wdrożyć na tym samym runnerze.

## Szybki start

1. Na GitHubie wybierz **Use this template → Create a new repository**.
2. Sklonuj swoje nowe repozytorium.
3. Zainstaluj Node.js 22 lub nowszy i uruchom z katalogu głównego:

   ```sh
   npm test
   npm run example
   ```

   Przykład nie ma zależności npm, więc nie wymaga `npm install`.

4. W Zapqio dodaj repozytorium:
   - URL własnego repozytorium, np. `https://github.com/twoja-organizacja/twoj-modul`;
   - rodzaj **Node**;
   - gałąź **main** lub inną faktycznie używaną gałąź;
   - dla prywatnego repozytorium również token z dostępem do jego odczytu.
5. Pobierz migawkę i sprawdź status struktury na szczegółach repozytorium.
6. Otwórz **Runnery → Wewnętrzne → wybrany runner → Wdrożenia** i kliknij **Wdróż**.
7. Dodaj do pipeline'u krok z metodą `template-node-hello` i runnerem wewnętrznym.
8. Przekaż do kroku:

   ```json
   {"name": "Anna"}
   ```

Oczekiwany wynik:

```json
{"message": "Cześć, Anna!", "secret_loaded": false}
```

Samo podłączenie repozytorium lub pobranie migawki nie wdraża metod na runnera.

## Struktura repozytorium

```text
.
├── methods/
│   ├── template-node-hello.js     # metoda widoczna w platformie
│   └── template-node-hello.json   # timeout i opis wejścia/wyjścia
├── lib/
│   └── greetings.js              # kod pomocniczy
├── examples/
│   ├── input.json
│   ├── input-with-secret.json
│   └── output.json
├── tools/
│   ├── run-local.cjs             # lokalny runner przykładu
│   └── check-syntax.cjs
├── tests/
│   └── template.test.cjs
├── package.json
├── .node-version
└── .github/workflows/check.yml
```

Wymagania dla repozytorium Node:

- Co najmniej jeden plik `methods/*.js`, bezpośrednio w katalogu `methods/`. Plik w katalogu głównym lub podkatalogu `methods/nested/` nie definiuje metody.
- Nazwa pliku bez `.js` jest nazwą metody. Używaj małych liter ASCII i cyfr, ewentualnie pojedynczych separatorów `-` lub `_`; maksymalnie 64 znaki.
- Nazwy metod muszą być unikalne wśród repozytoriów wdrożonych na danym runnerze, również pomiędzy Pythonem i Node'em.
- Kod i JSON zapisuj w UTF-8. W kontenerze Linux wielkość liter w ścieżkach ma znaczenie.
- Metadane są opcjonalne. Jeśli je dodasz, nazwa musi odpowiadać metodzie: `methods/template-node-hello.json` pasuje do `methods/template-node-hello.js`.
- Nie dodawaj metadanych w `methods/`, które nie mają odpowiadającego im pliku `.js`.
- Kod pomocniczy umieszczaj poza `methods/`, np. w `lib/`. Każdy plik `.js` bezpośrednio w `methods/` jest traktowany jako metoda.
- Nazwy plików i katalogów zaczynające się od `zapqio` są zarezerwowane. Bibliotekę `require("zapqio")` dostarcza platforma; nie dodawaj jej własnej kopii.
- Metody mają rozszerzenie `.js` i używają **CommonJS**. Zachowaj `"type": "commonjs"` w `package.json`. Ten szablon nie wymaga TypeScriptu ani kompilacji.

Pełna walidacja pobieranej migawki obejmuje również składnię plików JavaScript, obecność funkcji wejściowej i metadane. Status **„Poprawna struktura migawki”** na stronie repozytorium opisuje układ plików; sam status nie gwarantuje poprawnego wykonania kodu.

## Funkcja wejściowa

Każda metoda deklaruje funkcję `run(data)` w swoim pliku:

```javascript
function run(data) {
    const payload = JSON.parse(data);
    return JSON.stringify({ message: `Cześć, ${payload.name}!` });
}
```

- `data` jest tekstem przekazanym do kroku. Dla JSON sam wywołaj `JSON.parse(data)`.
- Wynikiem jest tekst zwracany z `run`. Obiekt lub tablicę zserializuj przez `JSON.stringify(...)`.
- Zwrócenie obiektu, tablicy, liczby lub wartości logicznej bez serializacji powoduje błąd.
- `null` lub `undefined` oznacza brak wyniku tekstowego.
- `console.log(...)` zapisuje log, a nie wynik kroku.
- Wyjątek albo odrzucona obietnica kończą krok błędem.
- Działania biznesowe i odczyt stałych wykonuj wewnątrz `run`.

Nie wywołuj `run(...)` samodzielnie na końcu pliku. Platforma dodaje sterownik wywołujący tę funkcję.

Samo `module.exports = (...) => ...` nie wystarcza: w pliku musi być dostępna funkcja o nazwie `run`. Eksport nie jest wymagany dla metody. Biblioteki pomocnicze mogą używać normalnego `module.exports`, jak [lib/greetings.js](lib/greetings.js).

Obsługiwane są również funkcje asynchroniczne:

```javascript
async function run(data) {
    const payload = JSON.parse(data);
    const result = await Promise.resolve({ message: `Cześć, ${payload.name}!` });
    return JSON.stringify(result);
}
```

Nie pozostawiaj niedokończonych operacji po zwróceniu wyniku. Przy połączeniach HTTP ustawiaj własny limit czasu, np. `signal: AbortSignal.timeout(5000)` dla `fetch`.

## Wejście, wyjście i timeout

Plik [methods/template-node-hello.json](methods/template-node-hello.json) zawiera:

```json
{
  "timeoutSeconds": 10,
  "in": {
    "type": "object",
    "properties": {
      "name": {"type": "string"},
      "check_secret": {"type": "boolean"}
    },
    "required": ["name"]
  },
  "out": {
    "type": "object",
    "properties": {
      "message": {"type": "string"},
      "secret_loaded": {"type": "boolean"}
    },
    "required": ["message", "secret_loaded"]
  }
}
```

`in` i `out` opisują dane w katalogu metod. W tym przykładzie są to obiekty JSON przesyłane jako tekst. Schematy nie zmieniają typu argumentu `data` ani nie serializują wyniku.

Obecnie platforma nie wymusza automatycznej zgodności danych wykonania ze schematami. Sprawdzaj wejście we własnym kodzie. W przykładzie `name` musi być niepustym tekstem, a opcjonalne `check_secret` wartością logiczną.

Obsługiwany opis obejmuje `type`, `properties`, `required`, `items` i `additionalProperties` jako zagnieżdżony schemat. Pole dopuszczające null można opisać jako `"type": ["string", "null"]`. Nie używaj `"additionalProperties": false`; obecny model platformy nie obsługuje tej postaci. Nie zakładaj obsługi całej specyfikacji JSON Schema.

`timeoutSeconds` musi być dodatnią liczbą całkowitą, obecnie maksymalnie **900 sekund**. W przykładzie limit wynosi 10 sekund. Brak tego pola oznacza domyślny limit runnera.

## Stałe i sekrety

Bibliotekę `zapqio` dostarcza platforma podczas wykonania:

```javascript
const zapqio = require("zapqio");

function run(data) {
    const token = zapqio.constants.get("EXAMPLE_API_TOKEN");
    // Użyj tokena do operacji zewnętrznej.
    return "OK";
}
```

`get` zwraca tekst. Nieistniejąca nazwa powoduje wyjątek. Wielkość liter w nazwie stałej ma znaczenie.

Aby sprawdzić opcjonalny wariant przykładu:

1. Dodaj w Zapqio stałą `EXAMPLE_API_TOKEN` i oznacz ją jako sekret.
2. Uruchom metodę z wejściem `{"name":"Anna","check_secret":true}`.
3. Wynik zawiera `"secret_loaded": true`, bez wartości sekretu.

Repozytorium zawiera wyłącznie nazwę stałej. Wartość pochodzi z kontekstu wykonania dostarczanego przez platformę. Token GitHub używany do pobierania repozytorium jest oddzielnym ustawieniem.

Nie zapisuj sekretów w kodzie, plikach `.env`, logach ani wynikach. Plik przypadkowo dodany do Gita trafiłby też do migawki. Platforma nie maskuje automatycznie wartości wypisywanych przez skrypt; za treść logów i wyniku odpowiada autor modułu.

## Logowanie i kontekst wykonania

```javascript
const zapqio = require("zapqio");

function run(data) {
    zapqio.log.info("Rozpoczęto przetwarzanie");
    zapqio.log.warn("Użyto wartości domyślnej");
    return "OK";
}
```

Dostępne są `debug`, `info`, `warn`/`warning`, `error`, `critical` i `isEnabled(level)`. Argumenty są formatowane jak w `util.format`, np. `zapqio.log.info("Przetworzono %d pozycji", count)`.

`console.log` trafia do logów informacyjnych. `console.debug/info/warn/error` zachowują odpowiednie poziomy po podłączeniu biblioteki, a stderr trafia do błędów. Widoczność poziomów zależy od ustawień runnera.

Kontekst to `zapqio.jobId`, `zapqio.attemptId` i `zapqio.methodName`. Identyfikator zadania pozostaje ten sam przy ponowieniu, a identyfikator próby jest nowy. Jeśli metoda wykonuje operacje zewnętrzne, np. tworzy dokumenty, uwzględnij możliwość ponowienia.

## Pakiety i pliki

Przykład używa wyłącznie wbudowanych modułów Node.js oraz `zapqio` dostarczanego przez platformę. Własną bibliotekę importuje przez `require("../lib/greetings")`.

Platforma nie wykonuje automatycznie `npm install`, `npm ci`, skryptów z `package.json` ani kompilacji TypeScriptu. Samo dopisanie zależności do `package.json` nie udostępni jej w executorze. Dostarczenie dodatkowych bibliotek trzeba uzgodnić z konfiguracją środowiska wykonania. Szablon nie wymaga żadnych zewnętrznych pakietów.

Każda próba wykonuje się w osobnym katalogu roboczym z kopią plików modułu. Zapisane tam pliki nie są trwałym magazynem danych między próbami. Skrypt działa jako użytkownik bez uprawnień root.

## Testowanie lokalne

Z katalogu głównego, z Node.js 22 lub nowszym:

```sh
npm run check
npm test
npm run example
node tools/run-local.cjs --input examples/input-with-secret.json --demo-secret
```

`--demo-secret` udostępnia wyłącznie sztuczną wartość testową. Lokalny runner nie łączy się z platformą ani jej bazą. Zastępuje `require("zapqio")` w pliku metody obiektem w pamięci.

Narzędzie jest przeznaczone do testowania tego przykładu i podobnych metod. Obsługuje wynik synchroniczny oraz Promise, ale nie odtwarza izolacji kontenera, limitów czasu ani pełnego runtime platformy. Biblioteki pomocnicze są ładowane zwykłym `require`; jeśli same importują `zapqio`, potrzebują osobnego przygotowania w testach. Po zmianach wykonaj również próbę w Zapqio.

Po dodaniu nowej metody możesz wskazać jej nazwę:

```sh
node tools/run-local.cjs --method moja-metoda --input examples/input.json
```

Workflow sprawdza składnię i uruchamia testy na Node.js **22 i 24**. Używa oficjalnych akcji [checkout](https://github.com/actions/checkout) i [setup-node](https://github.com/actions/setup-node). CI nie wdraża automatycznie kodu. Pole `"private": true` w `package.json` zapobiega przypadkowej publikacji pakietu do npm; repozytorium GitHub jest publiczne.

## Aktualizowanie modułu

1. Zmień kod lub metadane, uruchom testy, wykonaj commit i push na podłączoną gałąź.
2. Otwórz panel repozytorium lub wdrożeń albo kliknij **Sprawdź aktualizacje**.
3. Na runnerze kliknij **Aktualizuj**.
4. Uruchom pipeline i sprawdź wynik.

Push do Gita nie jest automatycznym wdrożeniem. Nowy krok i ponowienie korzystają z aktualnie wdrożonej wersji. Trwająca próba kończy się na wersji wybranej przy swoim starcie. Zapqio zapisuje faktycznie użyty commit dla każdej próby.

## Najczęstsze problemy

| Objaw | Co sprawdzić |
| --- | --- |
| Niepoprawna struktura migawki | Plik `.js` musi leżeć bezpośrednio w `methods/`. |
| Metoda nie pojawia się w pipeline | Sprawdź wdrożenie na odpowiednim runnerze i jego dostępność. |
| Brak funkcji wejściowej | Zadeklaruj `function run(data)` lub `async function run(data)`; sam eksport nie wystarczy. |
| `require is not defined` | Używaj CommonJS i `"type": "commonjs"`. |
| Błąd składni | Uruchom `npm run check`; sprawdź też pomocnicze pliki `.js`. |
| Błąd metadanych | Sprawdź JSON, nazwę odpowiadającego pliku `.js` i zakres `timeoutSeconds`. |
| Konflikt nazw metod | Zmień nazwę metody i odpowiadającego pliku metadanych. |
| Zły typ wyniku | Zwróć tekst, np. `JSON.stringify(wynik)`, zamiast obiektu. |
| `Cannot find module 'zapqio'` lokalnie | Użyj `tools/run-local.cjs`; bibliotekę produkcyjną dostarcza platforma. |
| Brak stałej `EXAMPLE_API_TOKEN` | Dodaj stałą albo pomiń `check_secret` w wejściu. |
| Brak pakietu npm w executorze | Platforma nie instaluje automatycznie zależności z `package.json`. |
