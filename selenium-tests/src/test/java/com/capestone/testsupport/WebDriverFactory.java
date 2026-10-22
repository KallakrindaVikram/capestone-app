package com.capestone.testsupport;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;

public final class WebDriverFactory {
  private WebDriverFactory() {}

  public static WebDriver createDriver() {
    return switch (TestConfig.BROWSER) {
      case "firefox" -> createFirefox();
      case "chrome" -> createChrome();
      default -> throw new IllegalArgumentException("Unsupported browser: " + TestConfig.BROWSER);
    };
  }

  private static WebDriver createChrome() {
    WebDriverManager.chromedriver().setup();
    ChromeOptions options = new ChromeOptions();
    if (TestConfig.HEADLESS) {
      options.addArguments("--headless=new");
    }
    options.addArguments("--window-size=1440,900");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--remote-allow-origins=*");
    options.addArguments("--disable-gpu");
    options.addArguments("--disable-extensions");
    return new ChromeDriver(options);
  }

  private static WebDriver createFirefox() {
    WebDriverManager.firefoxdriver().setup();
    FirefoxOptions options = new FirefoxOptions();
    if (TestConfig.HEADLESS) {
      options.addArguments("-headless");
    }
    options.addArguments("--width=1440", "--height=900");
    return new FirefoxDriver(options);
  }
}
