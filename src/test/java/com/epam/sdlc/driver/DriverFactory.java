package com.epam.sdlc.driver;

import com.epam.sdlc.config.TestConfig;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.time.Duration;

public final class DriverFactory {
  private DriverFactory() {}

  public static WebDriver create() {
    WebDriverManager.chromedriver().setup();

    ChromeOptions options = new ChromeOptions();
    options.addArguments("--window-size=1440,900");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--no-sandbox");

    if (TestConfig.HEADLESS) {
      options.addArguments("--headless=new");
    }

    WebDriver driver = new ChromeDriver(options);
    driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(30));
    driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(0));
    return driver;
  }
}
