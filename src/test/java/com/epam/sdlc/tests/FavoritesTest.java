package com.epam.sdlc.tests;

import com.epam.sdlc.api.ApiClient;
import com.epam.sdlc.config.TestConfig;
import com.epam.sdlc.pages.CatalogPage;
import com.epam.sdlc.pages.CourseDetailPage;
import com.epam.sdlc.pages.MyFavoritesPage;
import com.epam.sdlc.pages.SignInPage;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class FavoritesTest extends BaseUiTest {

  @Test
  void EPMCDMETST_67887_AC_favoritesEndpointsRequireAuth401AndMissingCourse404() {
    Response unauth = io.restassured.RestAssured.given()
        .when().post(TestConfig.API_BASE_URL + "/api/courses/1/favorite")
        .andReturn();
    assertEquals(401, unauth.statusCode());

    String joeAuth = ApiClient.basicAuth(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    Response missing = ApiClient.favorite(joeAuth, 999999);
    assertEquals(404, missing.statusCode());
    assertTrue(missing.asString().toLowerCase().contains("not found"));
  }

  @Test
  void EPMCDMETST_67887_AC_favoriteUnfavoriteIdempotent204() {
    Response list = ApiClient.listCourses(Map.of("page", 1, "pageSize", 10));
    assertEquals(200, list.statusCode());
    List<Map<String, Object>> courses = list.jsonPath().getList("$");
    assertTrue(courses.size() > 0);
    long courseId = ((Number) courses.get(0).get("id")).longValue();

    String joeAuth = ApiClient.basicAuth(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    assertEquals(204, ApiClient.favorite(joeAuth, courseId).statusCode());
    assertEquals(204, ApiClient.favorite(joeAuth, courseId).statusCode());
    assertEquals(204, ApiClient.unfavorite(joeAuth, courseId).statusCode());
    assertEquals(204, ApiClient.unfavorite(joeAuth, courseId).statusCode());
  }

  @Test
  void EPMCDMETST_67887_AC_myFavoritesApiReturnsOwnerDetails() {
    String sallyAuth = ApiClient.basicAuth(TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);
    Response res = ApiClient.myFavorites(sallyAuth);
    assertEquals(200, res.statusCode());

    List<Map<String, Object>> favorites = res.jsonPath().getList("$");
    assertNotNull(favorites);
    if (!favorites.isEmpty()) {
      Map<String, Object> first = favorites.get(0);
      assertTrue(first.containsKey("User"), "Favorites should include owner User object");
      Map<String, Object> owner = (Map<String, Object>) first.get("User");
      assertNotNull(owner.get("firstName"));
      assertNotNull(owner.get("lastName"));
    }
  }

  @Test
  void EPMCDMETST_67887_AC_unauthFavoriteRedirectsToSignIn() {
    CatalogPage catalog = new CatalogPage(driver).open("");
    assertTrue(catalog.courseLinkCount() > 0);
    catalog.openFirstCourse();

    CourseDetailPage detail = new CourseDetailPage(driver);
    // If button exists, click it. If not, fail as AC expects Favorite CTA on detail.
    assertTrue(detail.canSeeFavorite() || detail.canSeeUnfavorite(), "Favorite/Unfavorite button should be visible on detail");

    if (detail.canSeeFavorite()) {
      detail.clickFavorite();
      assertTrue(driver.getCurrentUrl().contains("/signin"), "Unauthenticated favorite must redirect to sign-in");
    } else {
      // If already favorited in anonymous session (unlikely), unfavorite should still require auth.
      detail.clickUnfavorite();
      assertTrue(driver.getCurrentUrl().contains("/signin"), "Unauthenticated unfavorite must redirect to sign-in");
    }
  }

  @Test
  void EPMCDMETST_67887_AC_authenticatedCanToggleFavoriteUnfavorite() {
    new SignInPage(driver).open().signIn(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    Response list = ApiClient.listCourses(Map.of("page", 1, "pageSize", 10));
    assertEquals(200, list.statusCode());
    List<Map<String, Object>> courses = list.jsonPath().getList("$");
    long courseId = ((Number) courses.get(0).get("id")).longValue();

    CourseDetailPage detail = new CourseDetailPage(driver).open(courseId);

    // Normalize state via API: ensure unfavorited then favorite via UI
    String joeAuth = ApiClient.basicAuth(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    ApiClient.unfavorite(joeAuth, courseId);

    driver.navigate().refresh();

    assertTrue(detail.canSeeFavorite(), "Expected Favorite button after normalization");
    detail.clickFavorite();

    assertTrue(detail.canSeeUnfavorite(), "After clicking Favorite, Unfavorite button must appear");
    detail.clickUnfavorite();
    assertTrue(detail.canSeeFavorite(), "After clicking Unfavorite, Favorite button must appear");
  }

  @Test
  void EPMCDMETST_67887_AC_myFavoritesUiListsCoursesWithOwnerDetails() {
    // Ensure at least one favorite for Joe
    Response list = ApiClient.listCourses(Map.of("page", 1, "pageSize", 10));
    assertEquals(200, list.statusCode());
    List<Map<String, Object>> courses = list.jsonPath().getList("$");
    long courseId = ((Number) courses.get(0).get("id")).longValue();

    String joeAuth = ApiClient.basicAuth(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    ApiClient.favorite(joeAuth, courseId);

    new SignInPage(driver).open().signIn(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    MyFavoritesPage favorites = new MyFavoritesPage(driver).open();
    assertTrue(favorites.hasAtLeastOneFavorite(), "My Favorites should show at least one course");
    assertTrue(favorites.hasOwnerDetailsVisible(), "My Favorites items must display owner details");
  }
}
