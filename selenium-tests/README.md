# Selenium + JUnit 5 end-to-end suite

Covers US-001 (search + pagination), US-002 (filter + sort) and US-003 (favorites). Each test method is named after its Jira key and acceptance criterion (for example `EPMCDMETST_68331_AC3_...`).

## Prerequisites
- Java 17+, Maven 3.9+, Chrome (or Firefox with `-Dbrowser=firefox`)
- API running on `http://localhost:5000` and the UI on `http://localhost:3000`
- The database freshly seeded (`cd api && npm run seed`): the tests rely on the seeded 30 courses, the owner "Alex Rivera", and the users `joe@smith.com` / `sally@jones.com`

## Run
```
mvn clean test                     # visible browser
mvn clean test -Dheadless=true     # headless
mvn clean test -DbaseUrl=http://host:3000 -DapiBaseUrl=http://host:5000
mvn clean test -Dtest=FavoritesTest
```

## Notes
- Tests that need to change data (favorites, ownership) create their own throwaway course through the API and delete it afterwards, so the seeded data is left as found. Joe's seeded favorites (courses 2, 5, 12) are never modified.
- The UI is compared against the API for the same query (titles and order), so a regression on either side fails the test.
- `Unable to find CDP implementation matching ...` warnings are harmless: the installed Chrome is newer than Selenium's bundled DevTools bindings.
