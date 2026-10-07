package com.capestone.pages;

import com.capestone.testsupport.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.util.List;

public class MyFavoritesPage {
  private final WebDriver driver;
  private final WebDriverWait wait;

  private final By heading = By.xpath("//h2[normalize-space()='My Favorites']");
  private final By loading = By.cssSelector(".loading");
  private final By favoriteCards = By.cssSelector("a.course--link");
  private final By favoriteTitles = By.cssSelector("a.course--link .course--title");
  private final By emptyState = By.cssSelector(".empty--state");

  public MyFavoritesPage(WebDriver driver, WebDriverWait wait) {
    this.driver = driver;
    this.wait = wait;
  }

  public MyFavoritesPage open() {
    driver.get(TestConfig.UI_BASE_URL + "/favorites");
    wait.until(ExpectedConditions.visibilityOfElementLocated(heading));
    wait.until(d -> d.findElements(loading).isEmpty()
        && (!d.findElements(favoriteCards).isEmpty() || !d.findElements(emptyState).isEmpty()));
    return this;
  }

  public int favoriteCount() {
    return driver.findElements(favoriteCards).size();
  }

  public List<String> favoriteTitles() {
    return driver.findElements(favoriteTitles).stream().map(e -> e.getText().trim()).toList();
  }

  public boolean isEmptyStateShown() {
    return !driver.findElements(emptyState).isEmpty();
  }
}
