package com.capestone.tests.us002;

import com.capestone.pages.CatalogPage;
import com.capestone.testsupport.ApiClient;
import com.capestone.testsupport.BaseUiTest;
import com.capestone.testsupport.TestConfig;
import io.restassured.response.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

/** US-002 / EPMCDMETST-68339: filter and sort courses on the course list. */
public class CatalogFilterSortTest extends BaseUiTest {

  private static List<String> apiTitles(Map<String, ?> params) {
    Response r = ApiClient.getCourses(params);
    assertThat(r.statusCode()).isEqualTo(200);
    return r.jsonPath().getList("items.title");
  }

  @Test
  @DisplayName("AC1: the owner filter shows only the selected owner's courses")
  void EPMCDMETST_68339_AC1_ownerFilterShowsOnlySelectedOwnerCourses() {
    int alexId = ApiClient.getOwnerIdByName(TestConfig.ALEX_FULL_NAME);

    CatalogPage catalog = new CatalogPage(driver, wait).open();
    catalog.selectOwnerByVisibleText(TestConfig.ALEX_FULL_NAME);

    assertThat(catalog.currentUrl()).contains("ownerId=" + alexId);
    List<String> uiTitles = catalog.getCourseTitlesFromCards();
    assertThat(uiTitles).isNotEmpty();
    assertThat(uiTitles).containsExactlyElementsOf(apiTitles(Map.of("ownerId", alexId, "page", 1, "pageSize", 12)));

    // Every course the API returns for this filter belongs to the selected owner
    Response filtered = ApiClient.getCourses(Map.of("ownerId", alexId, "pageSize", 50));
    List<Integer> ownerIds = filtered.jsonPath().getList("items.User.id");
    assertThat(ownerIds).isNotEmpty().allMatch(id -> Objects.equals(id, alexId));
    // ...and the filter actually removed other owners' courses
    assertThat(uiTitles.size()).isLessThan(ApiClient.getCourses(Map.of("pageSize", 50)).jsonPath().getInt("meta.totalCount"));
  }

  @Test
  @DisplayName("AC2: changing the sort reloads the filtered results (keeping the filter, back on page 1)")
  void EPMCDMETST_68339_AC2_sortChangeReloadsFilteredResults() {
    int alexId = ApiClient.getOwnerIdByName(TestConfig.ALEX_FULL_NAME);

    // Start on page 2 of Alex's courses so that the page reset is observable
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("ownerId=" + alexId + "&pageSize=5&page=2");
    assertThat(catalog.currentUrl()).contains("page=2");

    catalog.selectSortByVisibleText("Title (A-Z)");

    assertThat(catalog.currentUrl()).contains("ownerId=" + alexId).contains("sort=title_asc").doesNotContain("page=2");
    assertThat(catalog.getCourseTitlesFromCards()).containsExactlyElementsOf(
        apiTitles(Map.of("ownerId", alexId, "sort", "title_asc", "page", 1, "pageSize", 5)));
    assertThat(catalog.paginationStatusText()).isEqualTo("Page 1 of 2");

    // Sorting also keeps an active keyword search
    CatalogPage searched = new CatalogPage(driver, wait).openWithQuery("q=react&sort=title_asc");
    searched.selectSortByVisibleText("Newest");
    assertThat(searched.getCourseTitlesFromCards()).containsExactlyElementsOf(
        apiTitles(Map.of("q", "react", "sort", "newest")));
  }

  @Test
  @DisplayName("AC3: Title (A-Z) orders the courses by title ascending")
  void EPMCDMETST_68339_AC3_sortTitleAZ_ordersAscendingByTitle() {
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("pageSize=50");
    catalog.selectSortByVisibleText("Title (A-Z)");

    List<String> uiTitles = catalog.getCourseTitlesFromCards();
    List<String> expected = new ArrayList<>(uiTitles);
    expected.sort(String.CASE_INSENSITIVE_ORDER);
    assertThat(uiTitles).hasSizeGreaterThan(10).containsExactlyElementsOf(expected);
    assertThat(catalog.selectedSortText()).isEqualTo("Title (A-Z)");

    // Sorting is done by the server, not just on the visible page
    Response r = ApiClient.getCourses(Map.of("sort", "title_asc", "pageSize", 50));
    assertThat(r.statusCode()).isEqualTo(200);
    assertThat(r.jsonPath().getString("meta.sortApplied")).isEqualTo("title_asc");
    assertThat(r.jsonPath().<String>getList("items.title")).containsExactlyElementsOf(uiTitles);
  }

  @Test
  @DisplayName("AC4: Newest orders by created date descending, server-side")
  void EPMCDMETST_68339_AC4_sortNewest_ordersDescendingByCreatedDate_serverSide() {
    // The API does not expose createdAt; the seed creates courses oldest-first, so ids descend with age
    Response r = ApiClient.getCourses(Map.of("sort", "newest", "page", 1, "pageSize", 50));
    assertThat(r.statusCode()).isEqualTo(200);
    assertThat(r.jsonPath().getString("meta.sortApplied")).isEqualTo("newest");
    List<Integer> ids = r.jsonPath().getList("items.id");
    assertThat(ids).isNotEmpty().isSortedAccordingTo(Comparator.reverseOrder());

    // The UI default is Newest and shows that same order
    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("pageSize=50");
    assertThat(catalog.selectedSortText()).isEqualTo("Newest");
    assertThat(catalog.getCourseTitlesFromCards()).containsExactlyElementsOf(r.jsonPath().getList("items.title"));
  }

  @Test
  @DisplayName("AC5: an invalid sort defaults to Newest")
  void EPMCDMETST_68339_AC5_invalidSortDefaultsToNewest() {
    Response invalid = ApiClient.getCourses(Map.of("sort", "__invalid__", "page", 1, "pageSize", 12));
    assertThat(invalid.statusCode()).isEqualTo(200);
    assertThat(invalid.jsonPath().getString("meta.sortApplied")).isEqualTo("newest");
    assertThat(invalid.jsonPath().<String>getList("items.title")).containsExactlyElementsOf(
        apiTitles(Map.of("sort", "newest", "page", 1, "pageSize", 12)));

    CatalogPage catalog = new CatalogPage(driver, wait).openWithQuery("sort=__invalid__");
    assertThat(catalog.selectedSortText()).isEqualTo("Newest");
    wait.until(d -> !d.getCurrentUrl().contains("__invalid__"));
  }

  @Test
  @DisplayName("AC5: an invalid ownerId is rejected by the API")
  void EPMCDMETST_68339_AC5b_invalidOwnerIdReturns400() {
    Response r = ApiClient.getCourses(Map.of("ownerId", "abc"));
    assertThat(r.statusCode()).isEqualTo(400);
    assertThat(r.jsonPath().<String>getList("errors")).containsExactly("Invalid ownerId");
  }

  @Test
  @DisplayName("AC6: the URL reflects owner and sort and a reload preserves them")
  void EPMCDMETST_68339_AC6_urlReflectsOwnerAndSort_reloadPreserves() {
    int alexId = ApiClient.getOwnerIdByName(TestConfig.ALEX_FULL_NAME);

    CatalogPage catalog = new CatalogPage(driver, wait).open();
    catalog.selectOwnerByVisibleText(TestConfig.ALEX_FULL_NAME);
    catalog.selectSortByVisibleText("Title (A-Z)");
    List<String> before = catalog.getCourseTitlesFromCards();

    assertThat(catalog.currentUrl()).contains("ownerId=" + alexId).contains("sort=title_asc");

    driver.navigate().refresh();
    CatalogPage reloaded = new CatalogPage(driver, wait);
    wait.until(d -> !d.findElements(org.openqa.selenium.By.cssSelector("a.course--link")).isEmpty());

    assertThat(reloaded.currentUrl()).contains("ownerId=" + alexId).contains("sort=title_asc");
    wait.until(d -> TestConfig.ALEX_FULL_NAME.equals(reloaded.selectedOwnerText()));
    assertThat(reloaded.selectedSortText()).isEqualTo("Title (A-Z)");
    assertThat(reloaded.getCourseTitlesFromCards()).containsExactlyElementsOf(before);
  }
}
