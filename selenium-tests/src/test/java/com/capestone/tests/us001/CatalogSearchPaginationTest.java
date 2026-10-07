package com.capestone.tests.us001;

import com.capestone.pages.CatalogPage;
import com.capestone.testsupport.ApiClient;
import com.capestone.testsupport.BaseUiTest;
import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** US-001 / EPMCDMETST-68331: search courses by keyword with paginated results. */
public class CatalogSearchPaginationTest extends BaseUiTest {

  private static List<String> apiTitles(Map<String, ?> params) {
    Response r = ApiClient.getCourses(params);
    assertThat(r.statusCode()).isEqualTo(200);
    return r.jsonPath().getList("items.title");
  }

  @Test
  @DisplayName("AC1: keyword search matches title case-insensitively")
  void EPMCDMETST_68331_AC1_searchKeywordFiltersTitleOrDescription_caseInsensitive() {
    CatalogPage catalog = new CatalogPage(driver, wait).open();
    catalog.search("ReAcT");

    List<String> uiTitles = catalog.getCourseTitlesFromCards();
    assertThat(uiTitles).isNotEmpty();
    assertThat(catalog.currentUrl()).contains("q=ReAcT");

    // The UI shows exactly what the API returns for the same query
    assertThat(uiTitles).containsExactlyElementsOf(apiTitles(Map.of("q", "ReAcT", "page", 1, "pageSize", 12)));
    // ...and the search is case-insensitive on the server too
    assertThat(apiTitles(Map.of("q", "react"))).containsExactlyElementsOf(apiTitles(Map.of("q", "REACT")));
  }

  @Test
  @DisplayName("AC1: keyword search also matches the description")
  void EPMCDMETST_68331_AC1b_searchMatchesDescriptionOnly() {
    // "dovetail" only appears in the description of "Woodworking Joinery Basics"
    CatalogPage catalog = new CatalogPage(driver, wait).open();
    catalog.search("dovetail");

    assertThat(catalog.getCourseTitlesFromCards()).containsExactly("Woodworking Joinery Basics");
  }

  @Test
  @DisplayName("AC2: clearing the search restores the full list")
  void EPMCDMETST_68331_AC2_clearSearchShowsFullList() {
    CatalogPage catalog = new CatalogPage(driver, wait).open();
    List<String> fullList = catalog.getCourseTitlesFromCards();

    catalog.search("react");
    assertThat(catalog.getCourseCardCount()).isGreaterThan(0).isLessThan(fullList.size());

    catalog.clearSearch();

    assertThat(catalog.getCourseTitlesFromCards()).containsExactlyElementsOf(fullList);
    assertThat(catalog.searchInputValue()).isEmpty();
    assertThat(catalog.currentUrl()).doesNotContain("q=");
  }

  @Test
  @DisplayName("AC3: Next shows the next page of results and updates the page URL parameter")
  void EPMCDMETST_68331_AC3_nextPageUpdatesResultsAndUrlHasPageParam() {
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("pageSize=6");
    List<String> firstPage = catalog.getCourseTitlesFromCards();
    assertThat(firstPage).hasSize(6);
    assertThat(catalog.paginationStatusText()).isEqualTo("Page 1 of 5");

    catalog.nextPage();

    assertThat(catalog.currentUrl()).contains("page=2");
    List<String> secondPage = catalog.getCourseTitlesFromCards();
    assertThat(secondPage).hasSize(6).doesNotContainAnyElementsOf(firstPage);
    assertThat(secondPage).containsExactlyElementsOf(apiTitles(Map.of("page", 2, "pageSize", 6)));
    assertThat(catalog.paginationStatusText()).isEqualTo("Page 2 of 5");

    catalog.previousPage();
    assertThat(catalog.getCourseTitlesFromCards()).containsExactlyElementsOf(firstPage);
  }

  @Test
  @DisplayName("AC4: Previous is disabled on page 1 and Next is disabled on the last page")
  void EPMCDMETST_68331_AC4_prevDisabledOnPage1_nextDisabledOnLastPage() {
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("pageSize=6");
    assertThat(catalog.isPreviousDisabled()).isTrue();
    assertThat(catalog.isNextDisabled()).isFalse();

    int guard = 0;
    while (!catalog.isNextDisabled() && guard++ < 10) {
      catalog.nextPage();
    }

    assertThat(catalog.isNextDisabled()).isTrue();
    assertThat(catalog.isPreviousDisabled()).isFalse();
    assertThat(catalog.paginationStatusText()).isEqualTo("Page 5 of 5");
  }

  @Test
  @DisplayName("AC5: an invalid page in the URL is coerced to page 1")
  void EPMCDMETST_68331_AC5_invalidPageInUrlCoercesToPage1() {
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("page=-3&pageSize=6");

    assertThat(catalog.paginationStatusText()).isEqualTo("Page 1 of 5");
    assertThat(catalog.isPreviousDisabled()).isTrue();
    assertThat(catalog.getCourseTitlesFromCards())
        .containsExactlyElementsOf(apiTitles(Map.of("page", 1, "pageSize", 6)));
    // The URL is normalised so that the bad value does not linger
    wait.until(d -> !d.getCurrentUrl().contains("page=-3"));

    // The API applies the same rule
    Response r = ApiClient.getCourses(Map.of("page", -3, "pageSize", 6));
    assertThat(r.statusCode()).isEqualTo(200);
    assertThat(r.jsonPath().getInt("meta.page")).isEqualTo(1);
  }

  @Test
  @DisplayName("AC5: a non-numeric page in the URL is coerced to page 1")
  void EPMCDMETST_68331_AC5b_nonNumericPageCoercesToPage1() {
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("page=abc&pageSize=6");

    assertThat(catalog.paginationStatusText()).isEqualTo("Page 1 of 5");
    wait.until(d -> !d.getCurrentUrl().contains("page=abc"));
  }

  @Test
  @DisplayName("AC6: no matches shows the empty state and no course cards")
  void EPMCDMETST_68331_AC6_noMatchesShowsEmptyStateNoCards() {
    CatalogPage catalog = new CatalogPage(driver, wait).open();
    catalog.search("__NO_MATCH_KEYWORD_987654__");

    assertThat(catalog.isEmptyStateShown()).isTrue();
    assertThat(catalog.emptyStateText()).isEqualTo("No courses match your search.");
    assertThat(catalog.getCourseCardCount()).isZero();
    // The toolbar stays so the user can change the search
    assertThat(catalog.isToolbarShown()).isTrue();
    assertThat(catalog.isPaginationShown()).isFalse();
  }
}
