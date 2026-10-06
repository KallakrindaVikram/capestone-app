package com.epam.sdlc.config;

public final class TestConfig {
  private TestConfig() {}

  public static final String UI_BASE_URL = System.getProperty("ui.baseUrl", "http://localhost:3000");
  public static final String API_BASE_URL = System.getProperty("api.baseUrl", "http://localhost:5000");

  public static final boolean HEADLESS = Boolean.parseBoolean(System.getProperty("headless", "false"));

  public static final String JOE_EMAIL = "joe@smith.com";
  public static final String JOE_PASSWORD = "joepassword";

  public static final String SALLY_EMAIL = "sally@jones.com";
  public static final String SALLY_PASSWORD = "sallypassword";
}
