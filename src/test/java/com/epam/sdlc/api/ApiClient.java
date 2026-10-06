package com.epam.sdlc.api;

import com.epam.sdlc.config.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

public final class ApiClient {
  private ApiClient() {}

  private static String api(String path) {
    return TestConfig.API_BASE_URL + "/api" + path;
  }

  public static String basicAuth(String email, String password) {
    String token = Base64.getEncoder().encodeToString((email + ":" + password).getBytes(StandardCharsets.UTF_8));
    return "Basic " + token;
  }

  public static Response listCourses(Map<String, ?> queryParams) {
    return RestAssured.given()
        .baseUri(api("/courses"))
        .queryParams(queryParams)
        .when().get()
        .andReturn();
  }

  public static Response getCourse(long id) {
    return RestAssured.given()
        .when().get(api("/courses/" + id))
        .andReturn();
  }

  public static Response createCourse(String authHeader, Map<String, ?> payload) {
    return RestAssured.given()
        .header("Authorization", authHeader)
        .contentType(ContentType.JSON)
        .body(payload)
        .when().post(api("/courses"))
        .andReturn();
  }

  public static Response updateCourse(String authHeader, long id, Map<String, ?> payload) {
    return RestAssured.given()
        .header("Authorization", authHeader)
        .contentType(ContentType.JSON)
        .body(payload)
        .when().put(api("/courses/" + id))
        .andReturn();
  }

  public static Response deleteCourse(String authHeader, long id) {
    return RestAssured.given()
        .header("Authorization", authHeader)
        .when().delete(api("/courses/" + id))
        .andReturn();
  }

  public static Response favorite(String authHeader, long id) {
    return RestAssured.given()
        .header("Authorization", authHeader)
        .when().post(api("/courses/" + id + "/favorite"))
        .andReturn();
  }

  public static Response unfavorite(String authHeader, long id) {
    return RestAssured.given()
        .header("Authorization", authHeader)
        .when().delete(api("/courses/" + id + "/favorite"))
        .andReturn();
  }

  public static Response myFavorites(String authHeader) {
    return RestAssured.given()
        .header("Authorization", authHeader)
        .when().get(api("/users/me/favorites"))
        .andReturn();
  }
}
