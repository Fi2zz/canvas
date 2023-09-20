import { withDefaultValue, getGenericContext } from "./Mixins";
function requireHuozi(context) {
	/*! Bundled license information:

huozi/index.js:
  (*!
   * @author      Icemic Jia <bingfeng.web@gmail.com>
   * @copyright   2017-present Icemic Jia
   * @link        https://github.com/Icemic/huozi.js
   * @license     Apache License 2.0
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
	// node_modules/huozi/lib/code.js
	var DIANHAO = `\u3002\uFF0C\u3001\uFF0E\uFF1A\uFF1B\uFF01\u203C\uFF1F\u2047`;
	var BIAOHAO = `\u300C\u300D\u300E\u300F\u201C\u201D\u2018\u2019\uFF08\uFF09\u3010\u3011\u3016\u3017\u3014\u3015\uFF3B\uFF3D\uFF5B\uFF5D\u2E3A\u2014\u2026\u25CF\u2022\u2013\uFF5E~\uFF5E\uFF5E\xB7\uFE4F\u300A\u300B\u3008\u3009\uFF3F/\uFF0F`;
	var BIAODIAN = `${BIAOHAO}${DIANHAO} `;
	var BIAODIANVALIDATEND = `\u3002\uFF0C\u3001\uFF0E\uFF1A\uFF1B\uFF01\u203C\uFF1F\u2047\u300D\u300F\u201D\u2019\uFF09\u3011\u3017\u3015\uFF3D\uFF5D\u300B\u3009 `;
	var BIAODIANVALIDATSTART = `\u300C\u300E\u201C\u2018\uFF08\u3010\u3016\u3014\uFF3B\uFF5B\u300A\u3008 `;
	var INCOMPRESSIBLE = "\u203C\u2047\u2E3A\u2014";

	// node_modules/huozi/lib/isCJK.js
	var CJKCodes = [
		"\\u1100-\\u11FF",
		// Hangul Jamo
		"\\u2E80-\\u2EFF",
		// CJK Radicals Supplement
		"\\u2F00-\\u2FDF",
		// Kangxi Radicals
		"\\u2FF0-\\u2FFF",
		// Ideographic Description Characters
		"\\u3000-\\u303F",
		// CJK Symbols and Punctuation
		"\\u3040-\\u309F",
		// Hiragana
		"\\u30A0-\\u30FF",
		// Katakana
		"\\u3100-\\u312F",
		// Bopomofo
		"\\u3130-\\u318F",
		// Hangul Compatibility Jamo
		"\\u3190-\\u319F",
		// Kanbun 不是很懂你们日本人的“汉”文……
		"\\u31A0-\\u31BF",
		// Bopomofo Extended
		"\\u31F0-\\u31FF",
		// Katakana Phonetic Extensions
		"\\u3200-\\u32FF",
		// Enclosed CJK Letters and Months
		"\\u3300-\\u33FF",
		// CJK Compatibility
		//  '\\u3300-\\u33FF\\uFE30-\\uFE4F\\uF900-\\uFAFF\\u{2F800}-\\u{2FA1F}', // Other CJK Ideographs in Unicode, not Unified
		"\\u3400-\\u4DBF",
		// Ext-A
		"\\u4DC0-\\u4DFF",
		// Yijing Hexagram Symbols, 为了收集这些字符我已经累到怀疑人生了，谁来给我算一卦……
		"\\u4E00-\\u9FFF",
		// CJK
		"\\uAC00-\\uD7AF",
		// Hangul Syllables
		"\\uF900-\\uFAFF",
		// CJK Compatibility Ideograph
		"\\uFE30-\\uFE4F",
		// CJK Compatibility Forms, 竖排样式的横排字符……
		"\\uFF00-\\uFFEF",
		// Halfwidth and Fullwidth Forms
		"\\u{1D300}-\\u{1D35F}",
		// Tai Xuan Jing Symbols,
		"\\u{20000}-\\u{2A6DF}",
		// Ext-B
		"\\u{2A700}-\\u{2B73F}",
		// Ext-C
		"\\u{2B740}-\\u{2B81F}",
		// Ext-D
		"\\u{2B820}-\\u{2CEAF}",
		// Ext-E
		"\\u{2CEB0}-\\u{2EBEF}",
		// Ext-F
		"\\u{2F800}-\\u{2FA1F}",
		// CJK Compatibility Ideographs Supplement, 补充包你好，补充包再见
	];
	var regex;
	try {
		regex = new RegExp(`[${CJKCodes.join("")}]`, "u");
	} catch (e) {
		regex = new RegExp(`[${CJKCodes.slice(0, 21).join("")}]`);
	}
	function isCJK(text) {
		return regex.test(text);
	}
	context.font = "18px sans-serif";
	var FLAG_STDWIDTH = context.measureText("\u4E2D").width === 18;
	var defaultOptions = {
		fontFamily: "sans-serif",
		gridSize: 26,
		column: 25,
		row: Infinity,
		xInterval: 0,
		yInterval: 12,
		letterSpacing: 0,
		inlineCompression: true,
		forceGridAlignment: true,
		westernCharacterFirst: false,
		forceSpaceBetweenCJKAndWestern: false,
		fixLeftQuote: true,
	};
	function huozi(textSequence, layoutOptions, onSequence) {
		layoutOptions = Object.assign({}, defaultOptions, layoutOptions);
		const {
			fontFamily,
			gridSize,
			column,
			row,
			xInterval,
			yInterval,
			inlineCompression: FLAG_INLINE_COMPRESSION,
			forceGridAlignment,
			westernCharacterFirst,
			forceSpaceBetweenCJKAndWestern,
			fixLeftQuote,
		} = layoutOptions;
		let currentX = 0;
		let currentY = 0;
		let currentColumn = 0;
		let currentRow = 0;
		let lastIsPunctuation = false;
		let lastCharFontSize = 0;
		let needForceWrap = false;
		let maxFontSize = gridSize;
		let westernTextCache = [];
		let lastIsWesternChar = westernCharacterFirst;
		const layoutSequence = [];
		const lineWrap = () => {
			currentX = 0;
			currentColumn = 0;
			currentRow += 1;
			currentY += maxFontSize + yInterval;
			maxFontSize = gridSize;
			lastIsPunctuation = false;
			lastCharFontSize = 0;
			needForceWrap = false;
		};
		for (const char of [
			...textSequence,
			{ fontSize: 12, character: "\u3000" },
		]) {
			const { fontSize: charFontSize, character } = char;
			if (
				FLAG_INLINE_COMPRESSION &&
				lastIsPunctuation &&
				!BIAODIAN.includes(character)
			) {
				currentX += lastCharFontSize / 2 + xInterval;
				currentColumn += 0.5;
				lastIsPunctuation = false;
			}
			if (/[ “”‘’]/.test(character)) {
				if (lastIsWesternChar) {
					westernTextCache.push(char);
					continue;
				}
			}
			if (!isCJK(character) && !/[\n “”‘’]/.test(character)) {
				lastIsWesternChar = true;
				westernTextCache.push(char);
				continue;
			} else if (westernTextCache.length) {
				const forceSpace = forceSpaceBetweenCJKAndWestern ? 0.25 * gridSize : 0;
				if (currentX) {
					currentX += forceSpace;
				}
				let westernLayoutSequence, isMultiLine, currentX_tmp;
				[
					westernLayoutSequence,
					currentX_tmp,
					currentY,
					currentRow,
					isMultiLine,
				] = processWesternText(
					westernTextCache,
					layoutOptions,
					currentX,
					currentY,
					currentRow,
					column * gridSize,
					row
				);
				currentColumn = Math.ceil(currentX_tmp / (gridSize + xInterval));
				currentX = currentColumn * (gridSize + xInterval);
				if (!isMultiLine) {
					if (currentX - currentX_tmp < forceSpace) {
						currentColumn += 1;
						currentX = currentColumn * gridSize;
					}
					const offsetX3 =
						(forceSpace + currentX - currentX_tmp) / 2 - forceSpace;
					westernLayoutSequence = westernLayoutSequence.map((value) => {
						value.x += offsetX3;
						return onSequence ? onSequence(value) || value : value;
					});
				}
				layoutSequence.push(...westernLayoutSequence);
				lastIsWesternChar = false;
				westernTextCache = [];
			}
			let isLineEnd = false;
			if (currentColumn >= column) {
				isLineEnd = true;
				if (
					!BIAODIANVALIDATEND.includes(character) ||
					BIAODIANVALIDATSTART.includes(character) ||
					needForceWrap
				) {
					lineWrap();
				}
			}
			if (character === "\n") {
				!isLineEnd && lineWrap();
				continue;
			}
			context.font = `${charFontSize}px ${fontFamily}`;
			const width = context.measureText(character).width;
			let offsetX = 0;
			let offsetY = (charFontSize - gridSize) / 2;
			let doubleX = false;
			if (forceGridAlignment && charFontSize !== gridSize) {
				offsetX = (+forceGridAlignment * (charFontSize - gridSize)) / 2;
				currentColumn +=
					offsetX > 0 ? Math.ceil((offsetX * 2) / (gridSize + xInterval)) : 0;
				offsetX =
					((1 + Math.ceil((offsetX * 2) / (gridSize + xInterval))) *
						(gridSize + xInterval) -
						charFontSize) /
					2;
				currentX += offsetX;
				if (
					currentColumn >= column &&
					!BIAODIANVALIDATEND.includes(character)
				) {
					lineWrap();
					doubleX = true;
				}
			}
			let quoteFix = 0;
			quoteFix +=
				!lastIsPunctuation && character === "\u201C" ? charFontSize / 2 : 0;
			if (fixLeftQuote) {
				if (character === "\u201C" && !FLAG_STDWIDTH) {
					quoteFix += -charFontSize / 2;
				} else if (character === "\u201C" && width === charFontSize) {
					quoteFix += -charFontSize / 2;
				}
			}
			const item = {
				...char,
				x: currentX + quoteFix,
				y: currentY - offsetY,
				width,
				height: charFontSize,
			};
			layoutSequence.push(onSequence ? onSequence(item) || item : item);
			let offsetX2 = offsetX * (doubleX ? 2 : 1);
			if (offsetX2 > gridSize) {
				offsetX2 -= gridSize;
				currentColumn -= 1;
			}
			currentX += offsetX2;
			if (
				isLineEnd &&
				BIAODIANVALIDATEND.includes(character) &&
				!INCOMPRESSIBLE.includes(character)
			) {
				currentX += charFontSize / 2;
				currentColumn += 0.5;
				if (currentColumn % 1 !== 0.5) {
					needForceWrap = true;
				}
			} else if (
				FLAG_INLINE_COMPRESSION &&
				BIAODIAN.includes(character) &&
				!INCOMPRESSIBLE.includes(character)
			) {
				currentX += charFontSize / 2 + xInterval * +lastIsPunctuation;
				currentColumn += 0.5;
				lastIsPunctuation = !lastIsPunctuation;
			} else {
				currentX += charFontSize + xInterval;
				currentColumn += 1;
			}
			maxFontSize = Math.max(maxFontSize, charFontSize);
			lastCharFontSize = charFontSize;
			if (currentRow >= row) {
				break;
			}
		}
		layoutSequence.pop();
		return layoutSequence;
	}
	function processWesternText(
		textSequence,
		{ fontFamily, gridSize, yInterval, letterSpacing },
		currentX,
		currentY,
		currentRow,
		maxWidth,
		row
	) {
		const layoutSequence = [];
		let maxFontSize = gridSize;
		let word = "";
		let wordChar = [];
		let isMultiLine = false;
		if (textSequence[textSequence.length - 1].character !== " ") {
			textSequence.push({
				fontSize: 0,
				character: " ",
			});
		}
		for (const char of textSequence) {
			const { fontSize: charFontSize, character } = char;
			maxFontSize = Math.max(maxFontSize, charFontSize);
			if (character === " ") {
				const restSpace = maxWidth - currentX;
				const totalWidth = context.measureText(word).width;
				if (restSpace < totalWidth) {
					currentX = 0;
					currentY += maxFontSize + yInterval;
					currentRow += 1;
					isMultiLine = true;
					if (currentRow >= row) {
						break;
					}
				}
				for (const char2 of wordChar) {
					const { fontSize: charFontSize2, character: character2 } = char2;
					const offsetY = (charFontSize2 - gridSize) / 2;
					layoutSequence.push({
						...char2,
						x: currentX,
						y: currentY - offsetY,
					});
					currentX += char2.width + letterSpacing;
				}
				currentX += 0.35 * gridSize;
				word = "";
				wordChar = [];
			} else {
				context.font = `${charFontSize}px ${fontFamily}`;
				const width = context.measureText(character).width;
				word += character;
				wordChar.push({ ...char, width, height: charFontSize });
			}
		}
		return [
			layoutSequence,
			currentX - 0.35 * gridSize,
			currentY,
			currentRow,
			isMultiLine,
		];
	}
	return huozi;
}

const huozi = requireHuozi(getGenericContext());

function childrenAsString(children) {
	if (typeof children === "string") return children;
	if (Array.isArray(children)) return children.join("");
	if (typeof children == "number") return `${children}`;
	return "";
}

class TextHelper {
	static get doc() {
		return document.body;
	}
	static get font() {
		if (this._font) return this._font;
		const styles = getComputedStyle(this.doc);
		this._font = styles.getPropertyValue("font");
		return this._font;
	}
	static get fontSize() {
		if (this._fontSize) return this._fontSize;
		const styles = getComputedStyle(this.doc);
		return parseFloat(styles.getPropertyValue("font-size"));
	}
	static get TextAlign() {
		return withDefaultValue("left", "right", "center", "start", "end");
	}
	static get TextBaseline() {
		return withDefaultValue(
			"hanging",
			"top",
			"middle",
			"alphabetic",
			"ideographic",
			"bottom"
		);
	}
	get regexAstralSymbols() {
		return /([\uD800-\uDBFF][\uDC00-\uDFFF])/;
	}
	get specialForEmoji() {
		return [
			"\uFE0E",
			"\uFE0F",
			"\u200D",
			"\u{1F3FB}",
			"\u{1F3FC}",
			"\u{1F3FD}",
			"\u{1F3FE}",
			"\u{1F3FF}",
		];
	}

	get reFont() {
		return /^((?:[a-z\d-]+\s+)*)([\d.]+(%|em|px)|(?:x+-)?large|(?:x+-)?small|medium)(?:\s*\/\s*(normal|[\d.]+(%|px|em)?))?(\s.+)?$/;
	}
	get reSmallCaps() {
		return /\bsmall-caps\b/;
	}
	get reFontStyleItalics() {
		return /\b(?:italic|oblique)\b/;
	}
	get reFontWeightBold() {
		return /\bbold(?:er)?\b/;
	}
	get font() {
		return this._font || TextHelper.font;
	}
	set font(font) {
		this._font = font;
	}
	set fontSize(fontSize) {
		this._fontSize = fontSize;
	}
	get fontSize() {
		return this._fontSize || TextHelper.fontSize;
	}
	parseFont(input) {
		if (!input || (typeof input != "object" && typeof input != "string"))
			throw `invalid font`;
		const reFont = this.reFont;
		const reSmallCaps = this.reSmallCaps;
		const reFontStyleItalics = this.reFontStyleItalics;
		const reFontWeightBold = this.reFontWeightBold;
		const emSize = 16;
		const ptSize = 13.3333333;
		const percentSize = 0.01 * emSize;
		const absSide = {
			"xx-small": 9,
			"x-small": 10,
			smaller: 13.3333,
			small: 13,
			medium: 16,
			large: 18,
			larger: 19.2,
			"x-large": 24,
			"xx-large": 32,
		};

		if (typeof input == "string" || input.font) {
			if (input.font) input = input.font;
			const result = {};
			const matched = reFont.exec(input);
			result.fontFamily = (matched[6] || "").trim();
			// font size
			let fontSize = absSide[matched[2]] || parseFloat(matched[2]);
			if (matched[3] === "%") {
				fontSize *= percentSize;
			} else if (matched[3] === "em") {
				fontSize *= emSize;
			} else if (matched[3] === "pt") {
				fontSize *= ptSize;
			}
			result.fontSize = fontSize;
			// line height
			const lineHeight = matched[4];
			result.lineHeight = lineHeight;
			// variants
			if (reSmallCaps.test(matched[1])) result.fontVariant = "small-caps";
			// italics
			if (reFontStyleItalics.test(matched[1])) result.fontStyle = "italic";
			// bold
			if (reFontWeightBold.test(matched[1])) result.fontWeight = "bold";
			// (numberic tokens 550+ = bold)
			else {
				result.fontWeight = parseInt(/\b(\d+)\b/.exec(matched[1]), 10);
			}
			input = result;
		}

		function toString(node) {
			if (!node.fontFamily && !node.fontSize) return "";
			const fontSize = node.fontSize + "px";
			return [
				node.fontStyle,
				node.fontVariant,
				node.fontWeight,
				node.lineHeight ? fontSize + "/" + node.lineHeight : fontSize,
				node.fontFamily,
			]
				.filter(Boolean)
				.join(" ");
		}

		const result = {
			fontStyle: input.fontStyle,
			fontWeight: input.fontWeight,
			fontFamily: input.fontFamily || "sans-serif",
			fontVariant: input.fontVariant || "",
			fontSize: input.fontSize || 12,
			lineHeight: input.lineHeight,
		};
		this.fontSize = result.fontSize;
		this.fontWeight = result.fontWeight;
		this.fontFamily = result.fontFamily;
		this.fontVariant = result.fontVariant;
		this.lineHeight = result.lineHeight;
		this.fontStyle = result.fontStyle;
		this.font = toString(result);
		return toString(result);
	}
	splitText(text) {
		text = childrenAsString(text);
		if (text == "") return [];
		const specialForEmoji = this.specialForEmoji;
		const regexAstralSymbols = this.regexAstralSymbols;
		const result = [];
		let pendingChar = "";
		text = text.replace(/\r\n/g, "\n");
		let lastIsSpecialForEmoji = false;
		for (const char of text) {
			if (pendingChar && specialForEmoji.includes(char)) {
				lastIsSpecialForEmoji = "\u200D" === char;
				pendingChar += char;
			} else if (pendingChar && lastIsSpecialForEmoji) {
				lastIsSpecialForEmoji = false;
				pendingChar += char;
			} else if (pendingChar) {
				result.push(pendingChar);
				result.push(char);
				pendingChar = "";
			} else if (specialForEmoji.includes(char)) {
				pendingChar = result.pop() + char;
			} else if (regexAstralSymbols.test(char)) {
				pendingChar = char;
			} else {
				result.push(char);
			}
		}
		return result.map((character) => ({
			character,
			fontSize: this.fontSize,
		}));
	}
	getCharacters(text, { width, height, letterSpacing }) {

		const characters=
		this.splitText(text)

		return huozi(characters, {width , height , letterSpacing});
	}
}

export { TextHelper };
