# Plan Prezentacji Projektu: "Regulowany Rynek"

Poniższy scenariusz poprowadzi Cię krok po kroku przez najważniejsze mechanizmy Twojego projektu, ze szczególnym uwzględnieniem przykładów w kodzie i wykorzystanych wzorców projektowych.

---

## 1. Wstęp i Główne Założenia

**Co powiedzieć:**
> "Moim zadaniem było stworzenie turowej symulacji rynku, w której biorą udział Sprzedawcy, Kupujący oraz Bank Centralny. Głównym celem było sprawdzenie, jak interakcje pomiędzy podażą, popytem a polityką podatkową i stopami inflacji wpływają na stabilność rynku."

---

## 2. Wzorzec Obserwator (Observer)
Wzorzec ten posłużył do asynchronicznego powiadamiania uczestników rynku. Pokaż prowadzącemu dwie kluczowe implementacje:

### A) Powiadamianie o Ofertach (Sprzedawca -> Kupujący)
**Co powiedzieć:**
> "Kupujący nasłuchują nowych ofert pojawiających się u Sprzedawców."
**Gdzie to pokazać:** 
W pliku `agents/Seller.java` znajduje się wewnętrzna klasa powiadamiająca o ofertach, a Sprzedawca przy generowaniu oferty rozsyła powiadomienie:
```java
public class Seller extends Agent {
    private final OfferSubject offerNotifier = new OfferSubject();
    public static class OfferSubject extends Subject<Offer> {}

    public void generateOffers() {
        // ... (kalkulacja cen bazujących na marży i inflacji)
        offerNotifier.notifyObservers(new Offer(this, ProductType.BASIC, basicPrice, 10));
    }
}
```
Z kolei w `agents/Buyer.java` kupujący odbiera te oferty:
```java
public class Buyer extends Agent implements Observer<Offer> {
    @Override
    public void onNotify(Offer event) {
        currentOffers.add(event); // Rejestracja nowej oferty w liście potencjalnych zakupów
    }
}
```

### B) Powiadamianie o Inflacji (Bank Centralny)
**Co powiedzieć:**
> "Bank jest obserwowany w celu uiszczania podatków oraz rozsyła nową stopę inflacji na początku każdej tury."
**Gdzie to pokazać:**
W `bank/CentralBank.java` znajduje się powiadomienie po zebraniu danych z tury:
```java
public class CentralBank extends Subject<Double> implements Observer<Transaction> {
    public void adjustInflationForNextTurn() {
        // ... (kalkulacja nowej inflacji bazującej na zyskach vs oczekiwaniach)
        notifyObservers(currentInflation); // Powiadom wszystkich o nowej stopie
    }
}
```

---

## 3. Wzorzec Odwiedzający (Visitor)
**Co powiedzieć:**
> "Dzięki wzorcowi Visitor, logika taka jak np. odświeżanie siły nabywczej inflacją (dla Sprzedawcy) czy budżetów, została oddzielona od samych aktorów."

**Gdzie to pokazać:**
Zobacz plik `visitors/InflationUpdateVisitor.java`. Logika "odwiedzającego" wchodzi do metody sprzedawcy, odseparowując zachowanie od samej klasy `Seller`.
```java
public class InflationUpdateVisitor implements MarketVisitor {
    private final double newInflation;

    @Override
    public void visit(Seller seller) {
        seller.updateCostsBasedOnInflation(newInflation);
    }
    // Dla Kupującego ta wizyta jest tu ignorowana, ponieważ to sprzedawca ustala cenę na bazie kosztów
}
```
Wywołanie tej operacji w silniku głównym (`simulation/SimulationEngine.java`):
```java
InflationUpdateVisitor inflationVisitor = new InflationUpdateVisitor(bank.getCurrentInflation());
sellers.forEach(s -> s.accept(inflationVisitor));
```

---

## 4. Wzorzec Strategia (Strategy) i Reakcja na Szoki
**Co powiedzieć:**
> "Każdy sprzedawca posiada zmienną strategię ustalania marży, która bazuje m.in. na poziomie inflacji."

**Gdzie to pokazać:**
Pokaż różnicę między plikami z pakietu `strategies`:
- W `ConservativeStrategy.java` marża jest stała:
  ```java
  public double calculateMargin(double baseCost, double currentInflation) {
      return baseCost * 0.10; // Stałe 10% narzutu
  }
  ```
- W `AggressiveStrategy.java` marża reaguje mocniej i agresywniej m.in. na inflację:
  ```java
  public double calculateMargin(double baseCost, double currentInflation) {
      return baseCost * 0.4 + (currentInflation * 100); 
  }
  ```

---

## 5. Przebieg tury - `SimulationEngine.java`
**Co powiedzieć:**
> "Każda tura ma określoną kolejność wywołań. Najpierw wszyscy zostają zapoznani z sytuacją gospodarczą, później pojawiają się oferty i dokonywane są zakupy, z których odprowadzany jest podatek. Ostatnim krokiem jest skorygowanie inflacji na następną turę."

**Gdzie to pokazać:**
W pliku `simulation/SimulationEngine.java`, w metodzie `run()` widać jak krok po kroku na liście wywoływane są interakcje:
```java
public void run(int turns) {
    for (int t = 1; t <= turns; t++) {
        // 1. Wizytatorzy odwiedzają agentów (inflacja)
        sellers.forEach(s -> s.accept(inflationVisitor));
        
        // 2. Sprzedawcy tworzą oferty na ten miesiąc
        sellers.forEach(Seller::generateOffers);

        // 3. Kupujący decydują o zakupie BASIC lub LUXURY 
        var basicPurchase = buyer.makePurchaseDecision(ProductType.BASIC);
        if (basicPurchase.isPresent()) {
            double price = basicPurchase.get().price();
            // Powiadomienie Banku o transakcji celem opodatkowania
            bank.onNotify(new Transaction(ProductType.BASIC, price, 1, price * Config.TAX_RATE));
        }

        // 4. Korekta inflacji przez Bank na podstawie przychodów podatkowych z tej tury
        bank.adjustInflationForNextTurn();
    }
}
```

---

## 6. Zakończenie - Wykresy i Testy
W tym miejscu pokaż:
1. Pokaż 5 zielonych testów w `SimulationTest.java` i wspomnij, co weryfikują (m.in. jak bank reaguje na szok inflacyjny z testu `testInflationShockResistance`).
2. Uruchom klasę `Main.java` i wyświetl pliki `PNG` w folderze `results/` wygenerowane dzięki `JFreeChart`. Pokaż zwłaszcza korelację między spadkiem przychodów Banku a dynamiczną zmianą inflacji.
