package com.epam.sdlc.tests;

import com.epam.sdlc.driver.DriverFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.WebDriver;

public abstract class BaseUiTest {
  protected WebDriver driver;

  @BeforeEach
  void setUp() {
    driver = DriverFactory.create();
  }

  @AfterEach
  void tearDown() {
    if (driver != null) {
      driver.quit();
    }
  }
}
