package com.epam.sdlc.pages;

import com.epam.sdlc.config.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class CatalogPage extends BasePage {
  private final By searchInput = By.cssSelector("form[role='search'] input[name='q']");
  private final By searchButton = By.cssSelector("form[role='search'] button[type='submit']");
  private final By sortSelect = By.cssSelector("select#sort");

  // Real course cards only; the "New Course" tile links to /courses/create and must not be counted
  private final By courseLinks = By.cssSelector("a.course--link");

  // The toolbar renders while loading; these only exist once the course request has finished
  private final By resultsLoaded = By.cssSelector(".catalog--summary, .catalog--empty, .validation--errors");

  private final By paginationNav = By.cssSelector("nav[aria-label='Pagination']");
  private final By prevButton = By.xpath("//nav[@aria-label='Pagination']//button[contains(.,'Prev')]");
  private final By nextButton = By.xpath("//nav[@aria-label='Pagination']//button[contains(.,'Next')]");
  private final By pageLabel = By.cssSelector("nav[aria-label='Pagination'] span");

  private final By emptyState = By.xpath(
      "//p[contains(@class,'catalog--empty')][contains(.,'No courses match your search. Try a different keyword.')]");

  public CatalogPage(WebDriver driver) {
    super(driver);
  }

  public CatalogPage open(String queryString) {
    driver.get(TestConfig.UI_BASE_URL + "/courses" + (queryString == null ? "" : queryString));
    visible(resultsLoaded);
    return this;
  }

  public CatalogPage search(String keyword) {
    return reloadAfter(() -> {
      type(searchInput, keyword);
      click(searchButton);
    });
  }

  public CatalogPage sortBy(String value) {
    return reloadAfter(() -> new Select(visible(sortSelect)).selectByValue(value));
  }

  public boolean isEmptyStateVisible() {
    return wait.until(d -> isPresent(emptyState));
  }

  public int courseLinkCount() {
    return driver.findElements(courseLinks).size();
  }

  public void openFirstCourse() {
    clickable(courseLinks).click();
  }

  public boolean hasPagination() {
    return isPresent(paginationNav);
  }

  public boolean isPrevDisabled() {
    WebElement prev = visible(prevButton);
    return !prev.isEnabled() || "true".equals(prev.getAttribute("aria-disabled"));
  }

  public void clickNext() {
    reloadAfter(() -> click(nextButton));
  }

  public void clickPrev() {
    reloadAfter(() -> click(prevButton));
  }

  public String currentPageLabel() {
    return visible(pageLabel).getText();
  }

  // Runs an action that triggers a course request, then waits for the refreshed results.
  // The results block is replaced by a loading indicator, so the old element goes stale first.
  private CatalogPage reloadAfter(Runnable action) {
    WebElement before = visible(resultsLoaded);
    action.run();
    try {
      new WebDriverWait(driver, Duration.ofSeconds(3)).until(ExpectedConditions.stalenessOf(before));
    } catch (TimeoutException e) {
      // The action did not change the query (nothing to reload); fall through
    }
    visible(resultsLoaded);
    return this;
  }
}
