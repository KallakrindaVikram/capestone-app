package com.capestone.testsupport;

public final class TestConfig {
  private TestConfig() {}

  public static final String UI_BASE_URL = System.getProperty("baseUrl", "http://localhost:3000");
  public static final String API_BASE_URL = System.getProperty("apiBaseUrl", "http://localhost:5000");

  public static final boolean HEADLESS = Boolean.parseBoolean(System.getProperty("headless", "false"));
  public static final String BROWSER = System.getProperty("browser", "chrome").toLowerCase();

  // Seeded users (api/seed/data.json)
  public static final String JOE_EMAIL = "joe@smith.com";
  public static final String JOE_PASSWORD = "joepassword";

  public static final String SALLY_EMAIL = "sally@jones.com";
  public static final String SALLY_PASSWORD = "sallypassword";

  public static final String ALEX_FULL_NAME = "Alex Rivera";

  // Catalog defaults
  public static final int DEFAULT_PAGE_SIZE = Integer.parseInt(System.getProperty("pageSize", "12"));
}
