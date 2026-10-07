package com.capestone.pages;

import com.capestone.testsupport.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class CourseDetailPage {
  private final WebDriver driver;
  private final WebDriverWait wait;

  private final By courseName = By.cssSelector(".course--name");
  private final By favoriteToggle = By.cssSelector("button.favorite--toggle");
  private final By favoriteError = By.cssSelector(".favorite--error");

  public CourseDetailPage(WebDriver driver, WebDriverWait wait) {
    this.driver = driver;
    this.wait = wait;
  }

  public CourseDetailPage openById(int id) {
    driver.get(TestConfig.UI_BASE_URL + "/courses/" + id);
    return waitForLoad();
  }

  public CourseDetailPage waitForLoad() {
    wait.until(ExpectedConditions.visibilityOfElementLocated(courseName));
    wait.until(ExpectedConditions.visibilityOfElementLocated(favoriteToggle));
    return this;
  }

  public String courseTitle() {
    return driver.findElement(courseName).getText().trim();
  }

  public boolean isFavoriteControlVisible() {
    return !driver.findElements(favoriteToggle).isEmpty();
  }

  /** True when the toggle reports the course as favorited (aria-pressed="true"). */
  public boolean isFavorited() {
    return "true".equals(driver.findElement(favoriteToggle).getAttribute("aria-pressed"));
  }

  public String favoriteToggleText() {
    return driver.findElement(favoriteToggle).getText().trim();
  }

  public void toggleFavorite() {
    wait.until(ExpectedConditions.elementToBeClickable(favoriteToggle)).click();
  }

  /** Waits for the toggle to settle (request finished) in the given state. */
  public void waitUntilFavorited(boolean expected) {
    wait.until(d -> {
      WebElement el = d.findElement(favoriteToggle);
      return el.isEnabled() && String.valueOf(expected).equals(el.getAttribute("aria-pressed"));
    });
  }

  public boolean isFavoriteErrorShown() {
    return !driver.findElements(favoriteError).isEmpty();
  }

  /** Sets a JS flag that would be lost by a full page reload. */
  public void markPageInstance() {
    ((JavascriptExecutor) driver).executeScript("window.__seleniumPageMarker = true;");
  }

  public boolean isSamePageInstance() {
    Object marker = ((JavascriptExecutor) driver).executeScript("return window.__seleniumPageMarker === true;");
    return Boolean.TRUE.equals(marker);
  }

  public String currentUrl() {
    return driver.getCurrentUrl();
  }
}
