package com.epam.sdlc.tests;

import com.epam.sdlc.api.ApiClient;
import com.epam.sdlc.pages.CatalogPage;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class CatalogSearchPaginationTest extends BaseUiTest {

  @Test
  void EPMCDMETST_67871_AC_apiSearchReturnsXTotalCountHeader() {
    Map<String, Object> qp = new HashMap<>();
    qp.put("q", "LEARN");
    qp.put("page", 1);
    qp.put("pageSize", 10);

    Response res = ApiClient.listCourses(qp);
    assertEquals(200, res.statusCode(), "Expected 200 for valid search");
    String total = res.getHeader("X-Total-Count");
    assertNotNull(total, "X-Total-Count must be returned");
    assertTrue(Integer.parseInt(total) >= 0, "X-Total-Count must be numeric >= 0");
  }

  @Test
  void EPMCDMETST_67871_AC_apiValidatesQueryParams400ErrorsArray() {
    Map<String, Object> qp = new HashMap<>();
    qp.put("page", 0);
    qp.put("pageSize", 51);
    qp.put("sort", "bogus");
    qp.put("userId", "abc");

    Response res = ApiClient.listCourses(qp);
    assertEquals(400, res.statusCode());
    List<String> errors = res.jsonPath().getList("errors");
    assertNotNull(errors);
    String joined = String.join(" | ", errors);
    assertTrue(joined.contains("Invalid page"));
    assertTrue(joined.contains("Invalid pageSize"));
    assertTrue(joined.contains("Invalid userId"));
    assertTrue(joined.contains("Invalid sort"));
  }

  @Test
  void EPMCDMETST_67871_AC_uiSearchSyncsUrlAndShowsEmptyState() {
    CatalogPage catalog = new CatalogPage(driver).open("");
    catalog.search("zzzzzz-no-match");

    assertTrue(catalog.currentUrl().contains("/courses"));
    assertTrue(catalog.currentUrl().contains("q=zzzzzz-no-match"), "URL must include q parameter");
    assertTrue(catalog.isEmptyStateVisible(), "Empty-state message must be visible for no results");
  }

  @Test
  void EPMCDMETST_67871_AC_uiPaginationPrevNextUpdatesUrl() {
    CatalogPage catalog = new CatalogPage(driver).open("?page=1&pageSize=10");
    assertTrue(catalog.courseLinkCount() > 0, "Expected courses to render");

    if (!catalog.hasPagination()) {
      fail("Pagination nav not found. Seed more than one page of courses to validate.");
    }

    assertTrue(catalog.isPrevDisabled(), "Prev must be disabled on first page");
    catalog.clickNext();
    assertTrue(catalog.currentUrl().contains("page=2"), "URL must include page=2 after Next");
    catalog.clickPrev();
    assertTrue(catalog.currentUrl().contains("page=1"), "URL must include page=1 after Prev");
  }

  @Test
  void EPMCDMETST_67871_AC_uiSortUpdatesUrlAndResetsPageTo1() {
    CatalogPage catalog = new CatalogPage(driver).open("?page=2&pageSize=10");
    assertTrue(catalog.courseLinkCount() > 0, "Expected courses to render");

    catalog.sortBy("created_desc");
    assertTrue(catalog.currentUrl().contains("sort=created_desc"), "URL must include sort=created_desc");
    assertTrue(catalog.currentUrl().contains("page=1"), "Changing sort should reset page to 1");
  }
}
