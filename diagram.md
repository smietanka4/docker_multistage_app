# Diagram Komunikacji w Systemie (Wersja Tekstowa)

Poniżej znajduje się uproszczony schemat komunikacji w projekcie, oparty na strzałkach, który bez problemu odczytasz w każdym terminalu (w tym .zsh) oraz w dowolnym notatniku.

```text
========================================================================
                      ARCHITEKTURA I PRZEPŁYW DANYCH
========================================================================

[ Użytkownik (Przeglądarka) ] 
      │ 
      │ (1) Wchodzi na http://localhost
      ▼
[ Nginx (Reverse Proxy :80) ]
      │
      │ (2) Nginx kieruje do kontenera z frontendem i serwuje pliki
      ▼
[ Frontend (React / Vite) ]
      │
      │ (3) Użytkownik klika "Zaloguj". React wymyśla 'code_challenge' (magia PKCE)
      │ (4) Przeglądarka jest przekierowana na adres logowania Keycloaka
      ▼
[ Keycloak (Auth Server :8080) ]
      │
      │ (5) Użytkownik wpisuje login i hasło w formularzu
      │ (6) Keycloak weryfikuje dane i odsyła "Kod Tymczasowy" z powrotem do Frontendu
      ▼
[ Frontend (React / Vite) ]
      │
      │ (7) Frontend w tle wysyła Kod + nieszyfrowany 'code_verifier' do Keycloaka (PKCE)
      │ (8) Keycloak weryfikuje weryfikator i oddaje finalny Access Token (JWT)
      │
      │ (9) Użytkownik chce usunąć wydarzenie. Frontend wysyła żądanie na /api/events
      │     z dołączonym tokenem (Authorization: Bearer <Token>)
      ▼
[ Nginx (Reverse Proxy :80) ]
      │
      │ (10) Nginx rozpoznaje prefiks /api i kieruje żądanie do losowego węzła 
      │      backendu (Load Balancing)
      ▼
[ Backend (Node.js :3001 lub :3002) ]
      │
      │ (11) Weryfikacja: Backend oblicza podpis tokenu za pomocą klucza publicznego 
      │      pobranego wcześniej z Keycloaka. Jeśli rola to 'admin', przepuszcza dalej.
      │
      ├─────────────────────────────────────────┐
      │                                         │ 
      │ (12) Backend usuwa wydarzenie           │ (13) Backend kasuje stare dane w Cache
      ▼                                         ▼
[ PostgreSQL (Baza :5432) ]               [ Redis (Pamięć Podręczna :6379) ]
      │
      │ (14) Potwierdzenie usunięcia z bazy i wyczyszczenia pamięci
      ▼
[ Backend (Node.js) ]
      │
      │ (15) Odsyła odpowiedź 200 OK do Nginxa
      ▼
[ Frontend (React / Vite) ]
      │
      │ (16) Aktualizuje stronę i wydarzenie znika z ekranu użytkownika!
```

## Główne filary komunikacji:
1. **Nginx to dyrygent**: Użytkownik zawsze gada tylko z Nginxem (port 80). Nginx decyduje czy odesłać mu kolorową stronę (Frontend), czy przepuścić go do twardej logiki biznesowej (Backend /api).
2. **PKCE to kurier z zamkniętą kłódką**: Frontend (Kroki 3 i 7) wysyła do Keycloaka zamkniętą kłódkę na hasło, a po udanym logowaniu wysyła do niej kluczyk, żeby Keycloak wiedział, że zwraca token bezpieczeństwa właściwej osobie.
3. **Backend nie ufa nikomu**: Otrzymując żądanie (Krok 11), najpierw sam sprawdza matematyczną zgodność pieczęci na tokenie zanim w ogóle dotknie bazy danych. Dopiero potem uderza do **Postgresa**, nie zapominając o sprzątnięciu po sobie starych list w **Redis**.
