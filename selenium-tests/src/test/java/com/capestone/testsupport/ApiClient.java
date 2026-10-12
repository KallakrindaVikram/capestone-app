package com.capestone.testsupport;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/** Thin REST client used for assertions and for creating / cleaning up test data. */
public final class ApiClient {
  private ApiClient() {}

  private static RequestSpecification request() {
    return RestAssured.given().baseUri(TestConfig.API_BASE_URL).accept(ContentType.JSON);
  }

  private static RequestSpecification authed(String email, String password) {
    return request().header("Authorization", basicAuth(email, password));
  }

  public static Response getCourses(Map<String, ?> queryParams) {
    return request().queryParams(queryParams).get("/api/courses");
  }

  public static Response getOwners() {
    return request().get("/api/owners");
  }

  /** Returns the id of the owner with the given "First Last" name, from GET /api/owners. */
  public static int getOwnerIdByName(String fullName) {
    List<Map<String, Object>> owners = getOwners().jsonPath().getList("items");
    return owners.stream()
        .filter(o -> fullName.equals(o.get("firstName") + " " + o.get("lastName")))
        .map(o -> ((Number) o.get("id")).intValue())
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("No owner named " + fullName + " - is the DB seeded?"));
  }

  public static int getUserId(String email, String password) {
    Response r = authed(email, password).get("/api/users");
    if (r.statusCode() != 200) {
      throw new IllegalStateException("Cannot sign in as " + email + ": HTTP " + r.statusCode());
    }
    return r.jsonPath().getInt("id");
  }

  /** Detail lookup; pass null credentials for an anonymous request. */
  public static Response getCourseById(int id, String email, String password) {
    RequestSpecification spec = email == null ? request() : authed(email, password);
    return spec.get("/api/courses/" + id);
  }

  public static Response favoriteCourse(int courseId, String email, String password) {
    return authed(email, password).post("/api/courses/" + courseId + "/favorite");
  }

  public static Response favoriteCourseAnonymously(int courseId) {
    return request().post("/api/courses/" + courseId + "/favorite");
  }

  public static Response unfavoriteCourse(int courseId, String email, String password) {
    return authed(email, password).delete("/api/courses/" + courseId + "/favorite");
  }

  public static Response getMyFavorites(String email, String password) {
    return authed(email, password).get("/api/users/me/favorites");
  }

  public static List<Integer> getMyFavoriteIds(String email, String password) {
    return getMyFavorites(email, password).jsonPath().getList("items.id");
  }

  public static List<String> getMyFavoriteTitles(String email, String password) {
    return getMyFavorites(email, password).jsonPath().getList("items.title");
  }

  /** Creates a course owned by the given user and returns its id. */
  public static int createCourse(String email, String password, String title) {
    int userId = getUserId(email, password);
    Response r = authed(email, password)
        .contentType(ContentType.JSON)
        .body(Map.of("title", title, "description", "Created by the Selenium suite", "userId", userId))
        .post("/api/courses");
    if (r.statusCode() != 201) {
      throw new IllegalStateException("Could not create course: HTTP " + r.statusCode() + " " + r.asString());
    }
    String location = r.getHeader("Location");
    return Integer.parseInt(location.substring(location.lastIndexOf('/') + 1));
  }

  public static Response updateCourse(int id, String email, String password, Map<String, Object> body) {
    RequestSpecification spec = email == null ? request() : authed(email, password);
    return spec.contentType(ContentType.JSON).body(body).put("/api/courses/" + id);
  }

  public static Response deleteCourse(int id, String email, String password) {
    RequestSpecification spec = email == null ? request() : authed(email, password);
    return spec.delete("/api/courses/" + id);
  }

  private static String basicAuth(String email, String password) {
    String token = email + ":" + password;
    return "Basic " + Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8));
  }
}
