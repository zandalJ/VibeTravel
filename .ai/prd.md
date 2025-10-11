Dokument wymagań produktu (PRD) - VibeTravel
============================================

1\. Przegląd produktu
---------------------

VibeTravel to aplikacja mobilna zaprojektowana, aby uprościć proces planowania podróży. Głównym celem produktu jest wykorzystanie sztucznej inteligencji do przekształcania prostych notatek i preferencji użytkownika w szczegółowe, spersonalizowane plany wycieczek. Aplikacja skierowana jest do młodych, podróżujących solo, którzy szukają inspiracji i struktury w swoich podróżach, ale czują się przytłoczeni nadmiarem informacji dostępnych w internecie. MVP (Minimum Viable Product) skupia się na podstawowej funkcjonalności tworzenia notatek, zarządzania profilem preferencji oraz generowania planów podróży, z zamiarem wdrożenia w formie testów w zamkniętej grupie.

2\. Problem użytkownika
-----------------------

Planowanie angażujących i dobrze zorganizowanych wycieczek jest czasochłonne i skomplikowane. Potencjalni podróżnicy stają przed następującymi problemami:

*   Nadmiar informacji: Internet jest pełen rekomendacji, blogów i opinii, co utrudnia wybór i podjęcie decyzji.
    
*   Trudność w organizacji: Zebranie luźnych pomysłów, miejsc i aktywności w spójny, logiczny plan dnia jest wyzwaniem.
    
*   Brak personalizacji: Gotowe plany podróży rzadko odpowiadają indywidualnym zainteresowaniom, stylowi podróżowania i budżetowi.
    
*   Strach przed pominięciem czegoś ważnego (FOMO): Podróżnicy obawiają się, że mogą przegapić kluczowe atrakcje lub doświadczenia.
    

VibeTravel adresuje te problemy, oferując narzędzie, które automatyzuje proces tworzenia planu, bazując na konkretnych danych wejściowych i preferencjach użytkownika, co oszczędza czas i redukuje stres związany z planowaniem.

3\. Wymagania funkcjonalne
--------------------------

### 3.1. System kont użytkowników

*   Użytkownicy muszą mieć możliwość rejestracji nowego konta.
    
*   Użytkownicy muszą mieć możliwość logowania się na istniejące konto.
    

### 3.2. Profil użytkownika

*   Użytkownik powinien mieć możliwość zdefiniowania i zapisania swoich preferencji podróżniczych.
    
*   Preferencje powinny obejmować: budżet dzienny, zainteresowania (wybór z predefiniowanych tagów + pole "inne"), styl podróży i typowy czas jej trwania.
    

### 3.3. Notatki podróżnicze (CRUD)

*   Użytkownik musi mieć możliwość tworzenia nowych notatek podróżniczych.
    
*   Użytkownik musi mieć możliwość przeglądania listy swoich notatek.
    
*   Użytkownik musi mieć możliwość edytowania istniejących notatek.
    
*   Użytkownik musi mieć możliwość usuwania notatek.
    
*   Formularz notatki powinien zawierać pola: cel, daty (od-do), budżet całkowity, notatki dodatkowe.
    

### 3.4. Generator planów AI

*   Aplikacja musi być zintegrowana z modelem językowym OpenAI w celu generowania planów.
    
*   Każdy użytkownik ma limit 5 generacji planów na miesiąc.
    
*   System musi obsługiwać planowanie podróży o maksymalnej długości 14 dni.
    
*   Maksymalna długość notatek wejściowych i generowanego planu jest ograniczona do 10 000 znaków.
    
*   System musi konstruować precyzyjny prompt do AI, łącząc dane z notatki i profilu użytkownika.
    

### 3.5. Przeglądanie planów i historia

*   Wygenerowany plan musi być wyświetlany w czytelnym formacie Markdown.
    
*   Użytkownik musi mieć możliwość skopiowania treści planu do schowka.
    
*   Użytkownik musi mieć możliwość oceny planu (👍/👎) w celu zbierania danych zwrotnych.
    
*   Pod każdą notatką musi być widoczna chronologiczna lista linków do wszystkich wygenerowanych dla niej planów (historia wersji).
    
*   Musi być widoczny komunikat informujący, że podawane koszty są szacunkowe.
    

4\. Granice produktu
--------------------

Następujące funkcjonalności świadomie znajdują się poza zakresem MVP:

*   Współdzielenie planów podróży i inne funkcje społecznościowe.
    
*   Przesyłanie, analiza i wyświetlanie multimediów (np. zdjęć).
    
*   Zaawansowane funkcje logistyczne (np. integracja z systemami rezerwacji, mapy, wyznaczanie tras w czasie rzeczywistym).
    
*   Możliwość edycji wygenerowanego planu bezpośrednio w aplikacji.
    
*   Jakiekolwiek formy monetyzacji.
    
*   Zaawansowane narzędzia analityczne, regulaminy i polityki prywatności (nie są wymagane na etapie zamkniętych testów).
    

5\. Historyjki użytkowników
---------------------------

### System kont i profil

*   ID: US-001
    
*   Tytuł: Rejestracja i logowanie użytkownika
    
*   Opis: Jako nowy użytkownik, chcę móc założyć konto i zalogować się do aplikacji, aby bezpiecznie przechowywać moje notatki i preferencje.
    
*   Kryteria akceptacji:
    
    1.  Mogę zarejestrować się przy użyciu adresu e-mail i hasła.
        
    2.  Po pomyślnej rejestracji jestem automatycznie zalogowany.
        
    3.  Mogę zalogować się przy użyciu moich danych uwierzytelniających.
        
    4.  W przypadku podania błędnych danych logowania, widzę komunikat o błędzie.
        
    5.  Po zalogowaniu jestem przekierowywany na stronę główną lub stronę profilu (jeśli loguję się po raz pierwszy).
        
*   ID: US-002
    
*   Tytuł: Wypełnienie profilu użytkownika po raz pierwszy
    
*   Opis: Jako nowy użytkownik, po pierwszym zalogowaniu chcę zostać przekierowany na stronę profilu, aby móc zdefiniować moje preferencje podróżnicze.
    
*   Kryteria akceptacji:
    
    1.  Bezpośrednio po pierwszej rejestracji/logowaniu widzę ekran ustawień profilu.
        
    2.  Na ekranie profilu mogę ustawić: dzienny budżet, zainteresowania (tagi + "inne"), styl podróży, typowy czas trwania podróży.
        
    3.  Mam możliwość pominięcia tego kroku i przejścia do ekranu głównego.
        
    4.  Zapisane preferencje są powiązane z moim kontem.
        
*   ID: US-003
    
*   Tytuł: Edycja profilu użytkownika
    
*   Opis: Jako zarejestrowany użytkownik, chcę móc w dowolnym momencie edytować moje preferencje w profilu, aby generowane plany były zawsze aktualne.
    
*   Kryteria akceptacji:
    
    1.  Z poziomu aplikacji mogę przejść do ekranu edycji mojego profilu.
        
    2.  Widzę moje aktualnie zapisane preferencje w formularzu.
        
    3.  Mogę zmienić dowolne z pól i zapisać zmiany.
        
    4.  Zaktualizowane preferencje są wykorzystywane przy kolejnych generacjach planów.
        

### Zarządzanie notatkami podróżniczymi

*   ID: US-004
    
*   Tytuł: Widok ekranu głównego bez notatek
    
*   Opis: Jako nowy użytkownik, po zalogowaniu i przejściu na ekran główny chcę zobaczyć informację o braku notatek ("empty state") oraz jasną zachętę do stworzenia pierwszej notatki.
    
*   Kryteria akceptacji:
    
    1.  Jeśli nie mam żadnych notatek, na ekranie głównym wyświetlany jest specjalny komunikat.
        
    2.  Komunikat zawiera przycisk lub link, który przenosi mnie do formularza tworzenia nowej notatki.
        
*   ID: US-005
    
*   Tytuł: Tworzenie nowej notatki
    
*   Opis: Jako użytkownik, chcę móc stworzyć nową notatkę podróżniczą, aby zapisać podstawowe informacje o planowanej wycieczce.
    
*   Kryteria akceptacji:
    
    1.  Mogę otworzyć formularz tworzenia nowej notatki.
        
    2.  Formularz zawiera pola: "Cel", "Daty" (od-do), "Budżet" i "Notatki dodatkowe".
        
    3.  Po wypełnieniu i zapisaniu formularza, nowa notatka pojawia się na mojej liście notatek.
        
    4.  Próba zapisu notatki bez wypełnienia pola "Cel" skutkuje komunikatem o błędzie.
        
*   ID: US-006
    
*   Tytuł: Przeglądanie listy notatek
    
*   Opis: Jako użytkownik, chcę widzieć listę wszystkich moich notatek na ekranie głównym, aby mieć szybki dostęp do moich planów.
    
*   Kryteria akceptacji:
    
    1.  Na ekranie głównym widzę listę moich notatek.
        
    2.  Każdy element listy wyświetla kluczowe informacje, np. cel i daty.
        
    3.  Kliknięcie na notatkę przenosi mnie do jej szczegółowego widoku.
        
*   ID: US-007
    
*   Tytuł: Edycja istniejącej notatki
    
*   Opis: Jako użytkownik, chcę móc edytować moje istniejące notatki, aby zaktualizować informacje o podróży.
    
*   Kryteria akceptacji:
    
    1.  W widoku szczegółów notatki znajduje się opcja "Edytuj".
        
    2.  Po kliknięciu "Edytuj" otwiera się formularz z danymi notatki.
        
    3.  Mogę zmodyfikować dowolne pole i zapisać zmiany.
        
    4.  Zmiany są odzwierciedlone w widoku szczegółów notatki.
        
*   ID: US-008
    
*   Tytuł: Usuwanie notatki
    
*   Opis: Jako użytkownik, chcę móc usunąć notatkę, której już nie potrzebuję.
    
*   Kryteria akceptacji:
    
    1.  W widoku szczegółów notatki znajduje się opcja "Usuń".
        
    2.  Przed usunięciem widzę prośbę o potwierdzenie operacji.
        
    3.  Po potwierdzeniu notatka zostaje trwale usunięta z mojej listy.
        

### Generowanie i przeglądanie planów

*   ID: US-009
    
*   Tytuł: Generowanie planu podróży
    
*   Opis: Jako użytkownik, w widoku notatki chcę móc kliknąć przycisk "Generuj Plan", aby otrzymać szczegółowy plan podróży stworzony przez AI.
    
*   Kryteria akceptacji:
    
    1.  W widoku szczegółów notatki widoczny jest przycisk "Generuj Plan".
        
    2.  Obok przycisku widzę licznik dostępnych generacji w bieżącym miesiącu (np. "Pozostało: 5/5").
        
    3.  Kliknięcie przycisku wysyła zapytanie do AI z danymi z notatki i profilu.
        
    4.  Podczas generowania planu widzę wskaźnik ładowania.
        
    5.  Po pomyślnym wygenerowaniu, licznik generacji zmniejsza się o jeden.
        
*   ID: US-010
    
*   Tytuł: Obsługa limitu generacji planów
    
*   Opis: Jako użytkownik, chcę być poinformowany, gdy wyczerpię miesięczny limit generacji planów.
    
*   Kryteria akceptacji:
    
    1.  Gdy licznik generacji wynosi 0, przycisk "Generuj Plan" jest nieaktywny lub ukryty.
        
    2.  Przy próbie generacji po wyczerpaniu limitu widzę komunikat informujący o limicie i dacie jego odnowienia.
        
*   ID: US-011
    
*   Tytuł: Przeglądanie wygenerowanego planu
    
*   Opis: Jako użytkownik, po wygenerowaniu planu chcę go zobaczyć w przejrzystym i czytelnym formacie.
    
*   Kryteria akceptacji:
    
    1.  Plan jest wyświetlany w formacie Markdown, z podziałem na dni, aktywności i szacowane koszty.
        
    2.  Widoczny jest komunikat o szacunkowym charakterze kosztów.
        
    3.  Plan zawiera podsumowanie z całkowitym kosztem, wskazówkami i alternatywnymi propozycjami.
        
*   ID: US-012
    
*   Tytuł: Kopiowanie planu do schowka
    
*   Opis: Jako użytkownik, chcę móc łatwo skopiować cały wygenerowany plan, aby użyć go w innej aplikacji lub zapisać jako tekst.
    
*   Kryteria akceptacji:
    
    1.  W widoku planu znajduje się przycisk "Kopiuj do schowka".
        
    2.  Kliknięcie przycisku kopiuje całą treść planu do schowka systemowego.
        
    3.  Po skopiowaniu widzę komunikat potwierdzający (np. "Skopiowano!").
        
*   ID: US-013
    
*   Tytuł: Zbieranie opinii o planie
    
*   Opis: Jako użytkownik, chcę móc ocenić wygenerowany plan, aby pomóc twórcom w ulepszaniu algorytmu.
    
*   Kryteria akceptacji:
    
    1.  W widoku planu widoczne są ikony 👍 i 👎.
        
    2.  Mogę kliknąć jedną z ikon, aby zapisać moją ocenę.
        
    3.  Po kliknięciu ikona zostaje wizualnie zaznaczona.
        
    4.  Ocena jest zapisywana w bazie danych do celów analitycznych.
        
*   ID: US-014
    
*   Tytuł: Przeglądanie historii wersji planu
    
*   Opis: Jako użytkownik, chcę mieć dostęp do wszystkich poprzednich wersji planów wygenerowanych dla danej notatki.
    
*   Kryteria akceptacji:
    
    1.  W widoku szczegółów notatki, pod jej treścią, widzę sekcję "Historia Planów".
        
    2.  Sekcja zawiera listę linków do poprzednio wygenerowanych planów.
        
    3.  Linki są ułożone chronologicznie (od najnowszego do najstarszego) i zawierają datę generacji.
        
    4.  Kliknięcie na link otwiera widok konkretnego, historycznego planu.
        

6\. Metryki sukcesu
-------------------

Sukces MVP będzie mierzony za pomocą następujących kluczowych wskaźników:

*   Cel 1: Zaangażowanie w personalizację
    
    *   Metryka: 90% zarejestrowanych kont ma w pełni wypełnione preferencje turystyczne w profilu użytkownika.
        
    *   Metoda pomiaru: Manualna analiza danych w dedykowanej tabeli bazy danych po zakończeniu okresu testowego.
        
*   Cel 2: Częstotliwość korzystania z kluczowej funkcji
    
    *   Metryka: 75% zarejestrowanych kont generuje 3 lub więcej planów wycieczek w ciągu roku.
        
    *   Metoda pomiaru: Manualna analiza logów zdarzeń (generowanie planu) zapisywanych w bazie danych.