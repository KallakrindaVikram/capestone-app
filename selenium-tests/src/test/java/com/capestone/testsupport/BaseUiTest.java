package com.capestone.testsupport;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public abstract class BaseUiTest {
  protected WebDriver driver;
  protected WebDriverWait wait;

  @BeforeEach
  void setUpBase() {
    // A fresh browser per test means no cookies (and therefore no signed-in user) carry over
    driver = WebDriverFactory.createDriver();
    // Fail fast on a hung page load instead of waiting for the 5 minute default
    driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
    wait = new WebDriverWait(driver, Duration.ofSeconds(12));
  }

  @AfterEach
  void tearDownBase() {
    if (driver != null) {
      driver.quit();
    }
  }
}
