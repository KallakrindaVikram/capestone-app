package com.capestone.tests.us003;

import com.capestone.pages.CatalogPage;
import com.capestone.pages.CourseDetailPage;
import com.capestone.pages.MyFavoritesPage;
import com.capestone.pages.SignInPage;
import com.capestone.testsupport.ApiClient;
import com.capestone.testsupport.BaseUiTest;
import com.capestone.testsupport.TestConfig;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * US-003 / EPMCDMETST-68347: favorite courses for quick access.
 *
 * Each test works on a throwaway course owned by Sally and favorited (if at all) by Joe, so the
 * seeded courses and Joe's seeded favorites are never changed.
 */
public class FavoritesTest extends BaseUiTest {
  private int fixtureId;
  private String fixtureTitle;

  @BeforeEach
  void createFixtureCourse() {
    fixtureTitle = "Favorites fixture " + System.nanoTime();
    fixtureId = ApiClient.createCourse(TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD, fixtureTitle);
  }

  @AfterEach
  void removeFixtureCourse() {
    // Deleting the course also removes any favorites pointing at it
    ApiClient.deleteCourse(fixtureId, TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);
  }

  private boolean joeHasFavorited(int courseId) {
    return ApiClient.getMyFavoriteIds(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD).contains(courseId);
  }

  private void signInAsJoe() {
    new SignInPage(driver, wait).open().signIn(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
  }

  @Test
  @DisplayName("AC1: a signed-in user sees the Favorite toggle reflecting the current state")
  void EPMCDMETST_68347_AC1_signedInSeesFavoriteToggleOnCourseDetail() {
    signInAsJoe();

    CourseDetailPage detail = new CourseDetailPage(driver, wait).openById(fixtureId);
    assertThat(detail.isFavoriteControlVisible()).isTrue();
    assertThat(detail.isFavorited()).isFalse();
    assertThat(detail.favoriteToggleText()).contains("Favorite").doesNotContain("Favorited");

    // After favoriting, the toggle shows the favorited state on a fresh page load
    assertThat(ApiClient.favoriteCourse(fixtureId, TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD).statusCode())
        .isEqualTo(204);
    CourseDetailPage reloaded = new CourseDetailPage(driver, wait).openById(fixtureId);
    assertThat(reloaded.isFavorited()).isTrue();
    assertThat(reloaded.favoriteToggleText()).contains("Favorited");
  }

  @Test
  @DisplayName("AC1: the same course page is reached from the catalog")
  void EPMCDMETST_68347_AC1b_toggleVisibleWhenOpeningCourseFromCatalog() {
    signInAsJoe();

    CourseDetailPage detail = new CatalogPage(driver, wait).open().openFirstCourse();

    assertThat(detail.isFavoriteControlVisible()).isTrue();
  }

  @Test
  @DisplayName("AC2: toggling Favorite on saves it and updates the UI without a full page refresh")
  void EPMCDMETST_68347_AC2_toggleFavoriteOn_updatesUiWithoutFullRefresh() {
    signInAsJoe();
    CourseDetailPage detail = new CourseDetailPage(driver, wait).openById(fixtureId);
    String urlBefore = detail.currentUrl();
    detail.markPageInstance();

    detail.toggleFavorite();
    detail.waitUntilFavorited(true);

    assertThat(detail.favoriteToggleText()).contains("Favorited");
    assertThat(detail.currentUrl()).isEqualTo(urlBefore);
    assertThat(detail.isSamePageInstance()).as("page was not reloaded").isTrue();
    assertThat(joeHasFavorited(fixtureId)).isTrue();
  }

  @Test
  @DisplayName("AC3: toggling Favorite off removes it and updates the UI")
  void EPMCDMETST_68347_AC3_toggleFavoriteOff_updatesUi() {
    ApiClient.favoriteCourse(fixtureId, TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    signInAsJoe();
    CourseDetailPage detail = new CourseDetailPage(driver, wait).openById(fixtureId);
    assertThat(detail.isFavorited()).isTrue();
    detail.markPageInstance();

    detail.toggleFavorite();
    detail.waitUntilFavorited(false);

    assertThat(detail.favoriteToggleText()).doesNotContain("Favorited");
    assertThat(detail.isSamePageInstance()).isTrue();
    assertThat(joeHasFavorited(fixtureId)).isFalse();
  }

  @Test
  @DisplayName("AC4: My Favorites shows only the courses the signed-in user favorited")
  void EPMCDMETST_68347_AC4_myFavoritesShowsOnlyFavoritedCourses() {
    ApiClient.favoriteCourse(fixtureId, TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    List<String> joeFavoriteTitles = ApiClient.getMyFavoriteTitles(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    assertThat(joeFavoriteTitles).contains(fixtureTitle);

    signInAsJoe();
    MyFavoritesPage page = new MyFavoritesPage(driver, wait).open();

    assertThat(page.favoriteCount()).isEqualTo(joeFavoriteTitles.size());
    assertThat(page.favoriteTitles()).containsExactlyInAnyOrderElementsOf(joeFavoriteTitles);

    // A course Joe has not favorited is not listed
    List<String> allTitles = ApiClient.getCourses(Map.of("pageSize", 50)).jsonPath().getList("items.title");
    String notFavorited = allTitles.stream().filter(t -> !joeFavoriteTitles.contains(t)).findFirst().orElseThrow();
    assertThat(page.favoriteTitles()).doesNotContain(notFavorited);

    // Another user's favorites are separate
    assertThat(ApiClient.getMyFavoriteIds(TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD)).doesNotContain(fixtureId);
  }

  @Test
  @DisplayName("AC5: an unauthenticated favorite attempt redirects to Sign In and does not favorite")
  void EPMCDMETST_68347_AC5_unauthFavoriteRedirectsToSignin_actionNotCompleted() {
    CourseDetailPage detail = new CourseDetailPage(driver, wait).openById(fixtureId);
    assertThat(detail.isFavoriteControlVisible()).isTrue();

    detail.toggleFavorite();

    wait.until(d -> d.getCurrentUrl().contains("/signin"));
    assertThat(joeHasFavorited(fixtureId)).isFalse();
    assertThat(ApiClient.favoriteCourseAnonymously(fixtureId).statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("AC5: after signing in from that redirect the user returns to the course")
  void EPMCDMETST_68347_AC5b_afterSigninReturnsToCourse() {
    new CourseDetailPage(driver, wait).openById(fixtureId).toggleFavorite();
    wait.until(d -> d.getCurrentUrl().contains("/signin"));

    new SignInPage(driver, wait).waitForLoad().signIn(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    wait.until(d -> d.getCurrentUrl().endsWith("/courses/" + fixtureId));
    assertThat(new CourseDetailPage(driver, wait).waitForLoad().courseTitle()).isEqualTo(fixtureTitle);
  }

  @Test
  @DisplayName("AC5: My Favorites requires sign in")
  void EPMCDMETST_68347_AC5c_myFavoritesRequiresSignin() {
    driver.get(TestConfig.UI_BASE_URL + "/favorites");

    wait.until(d -> d.getCurrentUrl().contains("/signin"));
    assertThat(ApiClient.getMyFavorites("nobody@example.com", "wrong").statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("AC6: deleting a course removes its favorites (no orphans)")
  void EPMCDMETST_68347_AC6_deletingCourseRemovesRelatedFavorites_noOrphans() {
    ApiClient.favoriteCourse(fixtureId, TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);
    ApiClient.favoriteCourse(fixtureId, TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);
    assertThat(joeHasFavorited(fixtureId)).isTrue();
    List<Integer> joeBefore = ApiClient.getMyFavoriteIds(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD);

    Response deleted = ApiClient.deleteCourse(fixtureId, TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD);

    assertThat(deleted.statusCode()).isEqualTo(204);
    assertThat(ApiClient.getMyFavoriteIds(TestConfig.JOE_EMAIL, TestConfig.JOE_PASSWORD))
        .doesNotContain(fixtureId)
        .hasSize(joeBefore.size() - 1);
    assertThat(ApiClient.getMyFavoriteIds(TestConfig.SALLY_EMAIL, TestConfig.SALLY_PASSWORD)).doesNotContain(fixtureId);

    // The UI list no longer shows it either
    signInAsJoe();
    assertThat(new MyFavoritesPage(driver, wait).open().favoriteTitles()).doesNotContain(fixtureTitle);
  }
}
