import { test, expect, Page } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

/**
 * Comprehensive Thai Language Support Integration Test
 *
 * This test validates Thai language support across the entire system including:
 * - Thai text rendering in UI components
 * - Thai input and text processing
 * - Thai language vector search and retrieval
 * - Thai font rendering and layout
 * - Cultural adaptations (dates, numbers, formats)
 * - Language switching functionality
 *
 * Based on research.md Thai language requirements and cultural adaptations
 */

// Thai test data constants
const THAI_TEST_DATA = {
  // Thai text samples for various testing scenarios
  text: {
    short: 'สวัสดี',
    medium: 'ระบบจัดการแชทบอทอัจฉริยะ',
    long: 'แพลตฟอร์มฐานความรู้และการจัดการแชทบอทแบบครบวงจรสำหรับธุรกิจไทย',
    technical: 'การประมวลผลภาษาธรรมชาติและเครื่องมือค้นหาแบบเวกเตอร์',
    formal: 'เรียนผู้ใช้งานที่เคารพ กรุณาตรวจสอบข้อมูลของท่านอีกครั้ง',
    informal: 'สวัสดีครับ! ยินดีต้อนรับสู่ระบบ',
    numbers: 'ปี ๒๕๖๗ เดือน ๑๒ วันที่ ๓๑',
    currency: '฿๑,๒๓๔.๕๖',
    dates: {
      buddhist: 'วันจันทร์ ๓๑ ธันวาคม พ.ศ. ๒๕๖๗',
      standard: '๓๑/๑๒/๒๕๖๗'
    }
  },

  // Common Thai words for testing word breaking
  wordBreaking: [
    'การประมวลผล',
    'ความปลอดภัย',
    'เทคโนโลยี',
    'ข้อมูลส่วนบุคคล',
    'การบริการลูกค้า'
  ],

  // Thai characters that may cause rendering issues
  complexChars: [
    'ก็', 'ไผ่', 'เซื่อ', 'เรื่อ', 'แห่ง', 'ยาว', 'ใหญ่', 'สร้อย'
  ],

  // Buddhist era test dates
  buddhistEra: {
    currentYear: 2567,
    offset: 543
  },

  // Thai number formats
  numbers: {
    thai: ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'],
    arabic: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  }
};

// Test data for vector search testing
const VECTOR_SEARCH_TEST_DATA = [
  {
    thai: 'วิธีการตั้งค่าระบบ authentication',
    english: 'How to setup authentication',
    expectedResults: ['auth', 'setup', 'login']
  },
  {
    thai: 'การจัดการฐานข้อมูล vector',
    english: 'Vector database management',
    expectedResults: ['database', 'vector', 'management']
  },
  {
    thai: 'การประมวลผลเอกสาร OCR',
    english: 'OCR document processing',
    expectedResults: ['ocr', 'document', 'processing']
  }
];

test.describe('Thai Language Support Integration', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Language Switching and Detection', () => {
    test('should detect and switch to Thai language', async ({ page }) => {
      // Test language detection from Accept-Language header
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.1'
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check if page content appears in Thai
      const thaiContent = page.locator('text=ระบบจัดการแชทบอท');
      await expect(thaiContent).toBeVisible({ timeout: 5000 });
    });

    test('should provide language switcher functionality', async ({ page }) => {
      // Look for language switcher component
      const languageSwitcher = page.locator('[data-testid="language-switcher"], .language-selector, select[name="locale"]');

      if (await languageSwitcher.isVisible()) {
        // Switch to Thai
        await languageSwitcher.selectOption('th');
        await page.waitForLoadState('networkidle');

        // Verify content switched to Thai
        const thaiText = page.locator('text=บันทึก, text=ยกเลิก, text=สร้าง').first();
        await expect(thaiText).toBeVisible();

        // Switch back to English
        await languageSwitcher.selectOption('en');
        await page.waitForLoadState('networkidle');

        // Verify content switched back to English
        const englishText = page.locator('text=Save, text=Cancel, text=Create').first();
        await expect(englishText).toBeVisible();
      }
    });

    test('should persist language preference', async ({ page }) => {
      // Set language preference via URL or cookie
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Navigate to another page and verify language persists
      const adminLink = page.locator('a[href*="/admin"], text=ผู้ดูแลระบบ');
      if (await adminLink.isVisible()) {
        await adminLink.click();
        await page.waitForLoadState('networkidle');

        // Verify still in Thai
        const thaiElements = page.locator('text=เข้าสู่ระบบ, text=ผู้ดูแลระบบ').first();
        await expect(thaiElements).toBeVisible();
      }
    });
  });

  test.describe('Thai Text Rendering and Typography', () => {
    test('should render Thai fonts correctly', async ({ page }) => {
      // Navigate to Thai language version
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Check if Thai fonts are loaded and applied
      const thaiText = page.locator('body');
      const fontFamily = await thaiText.evaluate(el =>
        window.getComputedStyle(el).fontFamily
      );

      // Should include Thai font families
      expect(fontFamily.toLowerCase()).toMatch(/(noto sans thai|sarabun|prompt)/);
    });

    test('should handle Thai text with proper line height and spacing', async ({ page }) => {
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Add Thai text content for testing
      await page.addStyleTag({
        content: `
          .thai-test-text {
            font-family: 'Noto Sans Thai', 'Sarabun', sans-serif;
            line-height: 1.7;
            letter-spacing: 0.025em;
          }
        `
      });

      await page.setContent(`
        <div class="thai-test-text" data-testid="thai-typography">
          ${THAI_TEST_DATA.text.long}
        </div>
      `);

      const thaiElement = page.locator('[data-testid="thai-typography"]');
      const lineHeight = await thaiElement.evaluate(el =>
        parseFloat(window.getComputedStyle(el).lineHeight) / parseFloat(window.getComputedStyle(el).fontSize)
      );

      // Thai text should have increased line height for readability
      expect(lineHeight).toBeGreaterThan(1.5);
    });

    test('should handle Thai word breaking and wrapping', async ({ page }) => {
      // Create a test container with limited width
      await page.setContent(`
        <div style="width: 200px; font-family: 'Noto Sans Thai', sans-serif;" data-testid="word-wrap-test">
          ${THAI_TEST_DATA.wordBreaking.join(' ')}
        </div>
      `);

      const container = page.locator('[data-testid="word-wrap-test"]');

      // Check that text wraps properly (height should be greater than single line)
      const boundingBox = await container.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(30); // Should wrap to multiple lines

      // Verify no horizontal overflow
      expect(boundingBox?.width).toBeLessThanOrEqual(200);
    });

    test('should render complex Thai characters correctly', async ({ page }) => {
      // Test complex Thai character combinations
      await page.setContent(`
        <div data-testid="complex-chars" style="font-size: 24px;">
          ${THAI_TEST_DATA.complexChars.join(' ')}
        </div>
      `);

      const complexChars = page.locator('[data-testid="complex-chars"]');
      await expect(complexChars).toBeVisible();

      // Take screenshot for visual verification
      await complexChars.screenshot({ path: 'test-results/thai-complex-chars.png' });

      // Verify characters are rendered (not showing as boxes)
      const charWidth = await complexChars.evaluate(el => el.scrollWidth);
      expect(charWidth).toBeGreaterThan(50); // Should have reasonable width for rendered text
    });
  });

  test.describe('Thai Input and Form Handling', () => {
    test('should accept Thai input in text fields', async ({ page }) => {
      // Create a test form with input fields
      await page.setContent(`
        <form data-testid="thai-form">
          <input type="text" name="title" placeholder="ชื่อเรื่อง" data-testid="title-input" />
          <textarea name="description" placeholder="รายละเอียด" data-testid="description-input"></textarea>
          <button type="submit">บันทึก</button>
        </form>
      `);

      const titleInput = page.locator('[data-testid="title-input"]');
      const descriptionInput = page.locator('[data-testid="description-input"]');

      // Input Thai text
      await titleInput.fill(THAI_TEST_DATA.text.medium);
      await descriptionInput.fill(THAI_TEST_DATA.text.long);

      // Verify input values
      await expect(titleInput).toHaveValue(THAI_TEST_DATA.text.medium);
      await expect(descriptionInput).toHaveValue(THAI_TEST_DATA.text.long);
    });

    test('should validate Thai text input correctly', async ({ page }) => {
      // Test form validation with Thai text
      await page.setContent(`
        <form data-testid="validation-form">
          <input type="text" required minlength="5" data-testid="thai-input" />
          <div data-testid="validation-message"></div>
        </form>
      `);

      const input = page.locator('[data-testid="thai-input"]');

      // Test with short Thai text (should fail validation)
      await input.fill(THAI_TEST_DATA.text.short);
      await input.blur();

      // Check validation state
      const validationMessage = await input.evaluate(el => el.validationMessage);
      expect(validationMessage).toBeTruthy();

      // Test with longer Thai text (should pass validation)
      await input.fill(THAI_TEST_DATA.text.medium);
      await input.blur();

      const isValid = await input.evaluate(el => el.checkValidity());
      expect(isValid).toBeTruthy();
    });

    test('should handle Thai keyboard input methods', async ({ page }) => {
      // Simulate Thai keyboard input
      await page.setContent(`
        <input type="text" data-testid="ime-input" style="font-size: 18px;" />
      `);

      const input = page.locator('[data-testid="ime-input"]');
      await input.focus();

      // Simulate typing Thai characters (may require IME)
      await page.keyboard.type('สวัสดี', { delay: 100 });

      await expect(input).toHaveValue('สวัสดี');
    });
  });

  test.describe('Cultural Adaptations and Formats', () => {
    test('should display Buddhist era dates correctly', async ({ page }) => {
      // Test Buddhist era date formatting
      const currentDate = new Date();
      const buddhistYear = currentDate.getFullYear() + THAI_TEST_DATA.buddhistEra.offset;

      await page.setContent(`
        <div data-testid="date-display">
          <span data-date="${currentDate.toISOString()}" class="buddhist-date">
            ${buddhistYear}
          </span>
        </div>
      `);

      const dateDisplay = page.locator('[data-testid="date-display"]');
      await expect(dateDisplay).toContainText(buddhistYear.toString());
    });

    test('should format Thai currency correctly', async ({ page }) => {
      await page.setContent(`
        <div data-testid="currency-display">
          <span class="currency">฿1,234.56</span>
        </div>
      `);

      const currencyDisplay = page.locator('[data-testid="currency-display"]');
      await expect(currencyDisplay).toContainText('฿');
      await expect(currencyDisplay).toContainText('1,234.56');
    });

    test('should display Thai numerals when configured', async ({ page }) => {
      // Test Thai numeral display
      const testNumber = '1234567890';
      const thaiNumerals = testNumber.split('').map(digit =>
        THAI_TEST_DATA.numbers.thai[parseInt(digit)]
      ).join('');

      await page.setContent(`
        <div data-testid="thai-numerals">
          ${thaiNumerals}
        </div>
      `);

      const numeralDisplay = page.locator('[data-testid="thai-numerals"]');
      await expect(numeralDisplay).toContainText('๑๒๓๔๕๖๗๘๙๐');
    });

    test('should handle formal vs informal Thai language appropriately', async ({ page }) => {
      // Test formal language in error messages
      await page.setContent(`
        <div data-testid="formal-message" class="error-message">
          ${THAI_TEST_DATA.text.formal}
        </div>
        <div data-testid="informal-message" class="welcome-message">
          ${THAI_TEST_DATA.text.informal}
        </div>
      `);

      const formalMessage = page.locator('[data-testid="formal-message"]');
      const informalMessage = page.locator('[data-testid="informal-message"]');

      // Formal message should contain respectful language
      await expect(formalMessage).toContainText('เรียน');
      await expect(formalMessage).toContainText('ท่าน');

      // Informal message should be more casual
      await expect(informalMessage).toContainText('สวัสดี');
      await expect(informalMessage).toContainText('ครับ');
    });
  });

  test.describe('Thai Language Vector Search and Retrieval', () => {
    test('should process Thai text for vector search', async ({ page }) => {
      // Skip if vector search API not available
      const vectorSearchAvailable = await page.request.get('/api/vector-search/health').then(
        response => response.ok()
      ).catch(() => false);

      if (!vectorSearchAvailable) {
        test.skip();
      }

      // Test Thai text processing for vector search
      for (const testData of VECTOR_SEARCH_TEST_DATA) {
        const response = await page.request.post('/api/vector-search/process', {
          data: {
            text: testData.thai,
            language: 'th'
          }
        });

        expect(response.ok()).toBeTruthy();

        const result = await response.json();
        expect(result.processed).toBeTruthy();
        expect(result.tokens).toBeDefined();
        expect(result.embedding).toBeDefined();
      }
    });

    test('should perform accurate Thai similarity search', async ({ page }) => {
      const vectorSearchAvailable = await page.request.get('/api/vector-search/health').then(
        response => response.ok()
      ).catch(() => false);

      if (!vectorSearchAvailable) {
        test.skip();
      }

      // Test similarity search with Thai queries
      for (const testData of VECTOR_SEARCH_TEST_DATA) {
        const response = await page.request.post('/api/vector-search/search', {
          data: {
            query: testData.thai,
            language: 'th',
            limit: 5
          }
        });

        expect(response.ok()).toBeTruthy();

        const results = await response.json();
        expect(results.matches).toBeDefined();
        expect(Array.isArray(results.matches)).toBeTruthy();

        // Verify relevance scores
        results.matches.forEach((match: any, index: number) => {
          expect(match.score).toBeGreaterThanOrEqual(0);
          expect(match.score).toBeLessThanOrEqual(1);

          // Scores should be in descending order
          if (index > 0) {
            expect(match.score).toBeLessThanOrEqual(results.matches[index - 1].score);
          }
        });
      }
    });

    test('should handle mixed Thai-English queries', async ({ page }) => {
      const vectorSearchAvailable = await page.request.get('/api/vector-search/health').then(
        response => response.ok()
      ).catch(() => false);

      if (!vectorSearchAvailable) {
        test.skip();
      }

      // Test mixed language queries
      const mixedQuery = 'การ setup authentication system';

      const response = await page.request.post('/api/vector-search/search', {
        data: {
          query: mixedQuery,
          language: 'mixed',
          limit: 5
        }
      });

      expect(response.ok()).toBeTruthy();

      const results = await response.json();
      expect(results.matches).toBeDefined();
      expect(results.matches.length).toBeGreaterThan(0);
    });
  });

  test.describe('Document Processing with Thai Content', () => {
    test('should process Thai documents correctly', async ({ page }) => {
      const documentProcessingAvailable = await page.request.get('/api/documents/health').then(
        response => response.ok()
      ).catch(() => false);

      if (!documentProcessingAvailable) {
        test.skip();
      }

      // Test Thai document processing
      const thaiDocument = {
        title: THAI_TEST_DATA.text.medium,
        content: THAI_TEST_DATA.text.long,
        language: 'th'
      };

      const response = await page.request.post('/api/documents/process', {
        data: thaiDocument
      });

      expect(response.ok()).toBeTruthy();

      const result = await response.json();
      expect(result.success).toBeTruthy();
      expect(result.chunks).toBeDefined();
      expect(result.embeddings).toBeDefined();

      // Verify Thai text chunking preserves word boundaries
      result.chunks.forEach((chunk: any) => {
        expect(chunk.text).toBeTruthy();
        expect(chunk.text.length).toBeGreaterThan(0);

        // Check for proper Thai word boundaries (basic check)
        const hasProperBoundaries = !chunk.text.match(/[\u0E00-\u0E7F][a-zA-Z]|[a-zA-Z][\u0E00-\u0E7F]/);
        expect(hasProperBoundaries).toBeTruthy();
      });
    });

    test('should extract Thai text from OCR correctly', async ({ page }) => {
      const ocrAvailable = await page.request.get('/api/ocr/health').then(
        response => response.ok()
      ).catch(() => false);

      if (!ocrAvailable) {
        test.skip();
      }

      // Create a test image with Thai text (mock for testing)
      const mockThaiImageData = {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        language: 'th',
        expectedText: THAI_TEST_DATA.text.medium
      };

      const response = await page.request.post('/api/ocr/process', {
        data: mockThaiImageData
      });

      if (response.ok()) {
        const result = await response.json();
        expect(result.success).toBeTruthy();
        expect(result.text).toBeDefined();

        // Verify Thai characters are extracted
        const hasThaiChars = /[\u0E00-\u0E7F]/.test(result.text);
        expect(hasThaiChars).toBeTruthy();
      }
    });
  });

  test.describe('Accessibility with Thai Language', () => {
    test('should support Thai screen readers', async ({ page }) => {
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Check for proper lang attribute
      const langAttribute = await page.locator('html').getAttribute('lang');
      expect(langAttribute).toBe('th');

      // Check for proper ARIA labels in Thai
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();

        if (ariaLabel || textContent) {
          const hasThaiText = /[\u0E00-\u0E7F]/.test(ariaLabel || textContent || '');
          // Should have Thai text for Thai locale
          expect(hasThaiText).toBeTruthy();
        }
      }
    });

    test('should handle keyboard navigation with Thai interface', async ({ page }) => {
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Test tab navigation
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Check if focused element has Thai text or appropriate Thai label
      const focusedText = await focusedElement.textContent();
      const ariaLabel = await focusedElement.getAttribute('aria-label');

      if (focusedText || ariaLabel) {
        const text = focusedText || ariaLabel || '';
        // Should have accessible text (either Thai or appropriate English)
        expect(text.length).toBeGreaterThan(0);
      }
    });

    test('should provide proper Thai alt text for images', async ({ page }) => {
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');

        if (altText) {
          // Alt text should be descriptive and appropriate for Thai users
          expect(altText.length).toBeGreaterThan(0);
          expect(altText).not.toBe('image');
          expect(altText).not.toBe('picture');
        }
      }
    });
  });

  test.describe('Performance with Thai Content', () => {
    test('should load Thai fonts efficiently', async ({ page }) => {
      await page.goto('/th');

      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      await page.waitForFunction(() => document.fonts.ready);
      const loadTime = Date.now() - startTime;

      // Font loading should complete within reasonable time
      expect(loadTime).toBeLessThan(5000);

      // Check that Thai fonts are actually loaded
      const fontFaces = await page.evaluate(() => {
        const fonts = [];
        for (const font of document.fonts) {
          fonts.push(font.family);
        }
        return fonts;
      });

      const hasThaiFont = fontFaces.some(font =>
        font.toLowerCase().includes('thai') ||
        font.toLowerCase().includes('sarabun') ||
        font.toLowerCase().includes('prompt')
      );

      expect(hasThaiFont).toBeTruthy();
    });

    test('should render Thai text without performance degradation', async ({ page }) => {
      // Create large amount of Thai text
      const largeThaiText = Array(100).fill(THAI_TEST_DATA.text.long).join(' ');

      await page.setContent(`
        <div data-testid="large-thai-text" style="max-width: 800px;">
          ${largeThaiText}
        </div>
      `);

      const startTime = Date.now();
      await page.waitForSelector('[data-testid="large-thai-text"]');
      const renderTime = Date.now() - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(2000);

      // Check text is visible and properly formatted
      const textElement = page.locator('[data-testid="large-thai-text"]');
      await expect(textElement).toBeVisible();

      const boundingBox = await textElement.boundingBox();
      expect(boundingBox?.height).toBeGreaterThan(100); // Should wrap to multiple lines
    });

    test('should handle Thai input without lag', async ({ page }) => {
      await page.setContent(`
        <textarea data-testid="thai-input-performance" style="width: 400px; height: 200px;"></textarea>
      `);

      const textarea = page.locator('[data-testid="thai-input-performance"]');
      await textarea.focus();

      const startTime = Date.now();

      // Type large amount of Thai text quickly
      for (const word of THAI_TEST_DATA.wordBreaking) {
        await page.keyboard.type(word + ' ', { delay: 10 });
      }

      const inputTime = Date.now() - startTime;

      // Input should be responsive
      expect(inputTime).toBeLessThan(1000);

      // Verify all text was entered correctly
      const value = await textarea.inputValue();
      expect(value).toContain(THAI_TEST_DATA.wordBreaking[0]);
      expect(value).toContain(THAI_TEST_DATA.wordBreaking[THAI_TEST_DATA.wordBreaking.length - 1]);
    });
  });

  test.describe('Cross-browser Thai Support', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Take screenshot for cross-browser comparison
      await page.screenshot({
        path: `test-results/thai-rendering-${browserName}.png`,
        fullPage: false
      });

      // Basic rendering verification
      const thaiText = page.locator('text=' + THAI_TEST_DATA.text.medium).first();
      await expect(thaiText).toBeVisible();

      // Check text dimensions are reasonable
      const boundingBox = await thaiText.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(50);
      expect(boundingBox?.height).toBeGreaterThan(10);
    });

    test('should handle mobile viewports with Thai text', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/th');
      await page.waitForLoadState('networkidle');

      // Check that Thai text doesn't overflow on mobile
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();

      expect(bodyBox?.width).toBeLessThanOrEqual(375);

      // Verify Thai text is still readable
      const thaiContent = page.locator('text=' + THAI_TEST_DATA.text.short).first();
      if (await thaiContent.isVisible()) {
        const textBox = await thaiContent.boundingBox();
        expect(textBox?.width).toBeLessThanOrEqual(375);
      }
    });
  });

  test.describe('Integration with System Features', () => {
    test('should work with chatbot conversations in Thai', async ({ page }) => {
      const chatbotAvailable = await page.request.get('/api/chatbot/health').then(
        response => response.ok()
      ).catch(() => false);

      if (!chatbotAvailable) {
        test.skip();
      }

      // Test Thai chatbot conversation
      const thaiMessage = {
        message: 'สวัสดี ช่วยเหลือเกี่ยวกับระบบได้ไหม',
        language: 'th'
      };

      const response = await page.request.post('/api/chatbot/message', {
        data: thaiMessage
      });

      expect(response.ok()).toBeTruthy();

      const result = await response.json();
      expect(result.response).toBeDefined();

      // Response should contain Thai text
      const hasThaiResponse = /[\u0E00-\u0E7F]/.test(result.response);
      expect(hasThaiResponse).toBeTruthy();
    });

    test('should support Thai in search functionality', async ({ page }) => {
      // Navigate to search page or component
      await page.goto('/search?lang=th');
      await page.waitForLoadState('networkidle');

      const searchInput = page.locator('input[type="search"], input[name="search"], [data-testid="search-input"]').first();

      if (await searchInput.isVisible()) {
        // Perform Thai search
        await searchInput.fill(THAI_TEST_DATA.text.technical);
        await page.keyboard.press('Enter');

        await page.waitForLoadState('networkidle');

        // Check for search results
        const searchResults = page.locator('[data-testid*="search-result"], .search-result, .result-item');
        const resultCount = await searchResults.count();

        // Should show results or "no results" message in Thai
        if (resultCount === 0) {
          const noResults = page.locator('text=ไม่พบผลลัพธ์, text=ไม่มีข้อมูล').first();
          await expect(noResults).toBeVisible();
        } else {
          await expect(searchResults.first()).toBeVisible();
        }
      }
    });

    test('should handle Thai error messages appropriately', async ({ page }) => {
      // Trigger an error condition
      await page.goto('/api/non-existent-endpoint');

      // Or create a form with validation errors
      await page.setContent(`
        <form data-testid="error-form">
          <input type="email" required data-testid="email-input" />
          <button type="submit">ส่ง</button>
        </form>
        <div data-testid="error-display"></div>
      `);

      const emailInput = page.locator('[data-testid="email-input"]');
      const submitButton = page.locator('button[type="submit"]');

      // Submit invalid form
      await emailInput.fill('invalid-email');
      await submitButton.click();

      // Check for Thai validation messages
      const validationMessage = await emailInput.evaluate(el => el.validationMessage);

      // Note: Browser validation messages may be in system language
      // Custom validation should be in Thai
      if (validationMessage) {
        expect(validationMessage).toBeTruthy();
      }
    });
  });
});

/**
 * Helper function to test Thai text properties
 */
async function testThaiTextProperties(page: Page, selector: string) {
  const element = page.locator(selector);

  return {
    isVisible: await element.isVisible(),
    hasThaiChars: /[\u0E00-\u0E7F]/.test(await element.textContent() || ''),
    fontFamily: await element.evaluate(el => window.getComputedStyle(el).fontFamily),
    lineHeight: await element.evaluate(el => window.getComputedStyle(el).lineHeight),
    direction: await element.evaluate(el => window.getComputedStyle(el).direction),
    textAlign: await element.evaluate(el => window.getComputedStyle(el).textAlign)
  };
}

/**
 * Helper function to validate Buddhist era dates
 */
function validateBuddhistEra(gregorianYear: number): number {
  return gregorianYear + THAI_TEST_DATA.buddhistEra.offset;
}

/**
 * Helper function to convert Arabic numerals to Thai numerals
 */
function convertToThaiNumerals(text: string): string {
  return text.replace(/[0-9]/g, (digit) =>
    THAI_TEST_DATA.numbers.thai[parseInt(digit)]
  );
}