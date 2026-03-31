import { Injectable } from '@nestjs/common';
import * as opentype from 'opentype.js';

export type FontInspectionWarning = {
  code: string;
  message: string;
  severity: 'warning';
};

export type FontInspectionResult = {
  metadata: {
    familyName: string | null;
    subfamilyName: string | null;
    fullName: string | null;
    postScriptName: string | null;
    styleName: string;
    weightClass: number;
    weightLabel: string;
    isItalic: boolean;
    unitsPerEm: number | null;
    glyphCount: number;
    ascender: number | null;
    descender: number | null;
    supportedUnicodeRanges: string[];
    fileFormat: string;
  };
  warnings: FontInspectionWarning[];
};

@Injectable()
export class FontInspectionService {
  inspectFont(fileBuffer: Buffer, originalFilename: string): FontInspectionResult {
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;
    const font = opentype.parse(arrayBuffer);
    const familyName = this.readEnglishName(font.names.fontFamily);
    const subfamilyName = this.readEnglishName(font.names.fontSubfamily);
    const fullName = this.readEnglishName(font.names.fullName);
    const postScriptName = this.readEnglishName(font.names.postScriptName);
    const derivedStyle = this.deriveStyleMetadata(subfamilyName, fullName);
    const warnings: FontInspectionWarning[] = [];
    const supportedUnicodeRanges = this.detectSupportedUnicodeRanges(font);

    if (!familyName) {
      warnings.push({
        code: 'MISSING_FAMILY_NAME',
        message: 'The font file does not expose a readable family name in the name table.',
        severity: 'warning',
      });
    }

    if (!supportedUnicodeRanges.includes('ethiopic')) {
      warnings.push({
        code: 'ETHIOPIC_COVERAGE_NOT_DETECTED',
        message: 'No Ethiopic codepoints were detected in the uploaded font.',
        severity: 'warning',
      });
    }

    if (!this.filenameLooksLikeFont(originalFilename)) {
      warnings.push({
        code: 'UNUSUAL_FILENAME',
        message: 'The uploaded filename does not use a common font extension.',
        severity: 'warning',
      });
    }

    return {
      metadata: {
        familyName,
        subfamilyName,
        fullName,
        postScriptName,
        styleName: derivedStyle.styleName,
        weightClass: derivedStyle.weightClass,
        weightLabel: derivedStyle.weightLabel,
        isItalic: derivedStyle.isItalic,
        unitsPerEm: font.unitsPerEm ?? null,
        glyphCount: font.glyphs.length,
        ascender: font.ascender ?? null,
        descender: font.descender ?? null,
        supportedUnicodeRanges,
        fileFormat: this.detectFileFormat(originalFilename),
      },
      warnings,
    };
  }

  private readEnglishName(nameTable: Record<string, string> | undefined): string | null {
    if (!nameTable) {
      return null;
    }

    return nameTable.en ?? Object.values(nameTable)[0] ?? null;
  }

  private detectSupportedUnicodeRanges(font: opentype.Font): string[] {
    const ranges = new Set<string>();

    for (let index = 0; index < font.glyphs.length; index += 1) {
      const glyph = font.glyphs.get(index);
      const unicode = glyph.unicode;

      if (typeof unicode !== 'number') {
        continue;
      }

      if (unicode >= 0x1200 && unicode <= 0x137f) {
        ranges.add('ethiopic');
      }

      if (
        (unicode >= 0x0041 && unicode <= 0x005a) ||
        (unicode >= 0x0061 && unicode <= 0x007a)
      ) {
        ranges.add('latin');
      }
    }

    return Array.from(ranges).sort();
  }

  private filenameLooksLikeFont(filename: string): boolean {
    return /\.(ttf|otf|woff|woff2)$/i.test(filename);
  }

  private detectFileFormat(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  private deriveStyleMetadata(subfamilyName: string | null, fullName: string | null) {
    const basis = `${subfamilyName ?? ''} ${fullName ?? ''}`.toLowerCase();
    const isItalic = /\b(italic|oblique)\b/.test(basis);
    const weightScale: Array<{ label: string; weightClass: number; patterns: RegExp[] }> = [
      { label: 'Thin', weightClass: 100, patterns: [/\bthin\b/] },
      { label: 'Extra Light', weightClass: 200, patterns: [/\b(extra[- ]light|ultra[- ]light)\b/] },
      { label: 'Light', weightClass: 300, patterns: [/\blight\b/] },
      { label: 'Medium', weightClass: 500, patterns: [/\bmedium\b/] },
      { label: 'Semi Bold', weightClass: 600, patterns: [/\b(semi[- ]bold|demi[- ]bold)\b/] },
      { label: 'Bold', weightClass: 700, patterns: [/\bbold\b/] },
      { label: 'Extra Bold', weightClass: 800, patterns: [/\b(extra[- ]bold|ultra[- ]bold)\b/] },
      { label: 'Black', weightClass: 900, patterns: [/\b(black|heavy)\b/] },
    ];

    for (const entry of weightScale) {
      if (entry.patterns.some((pattern) => pattern.test(basis))) {
        return {
          styleName: subfamilyName ?? entry.label,
          weightClass: entry.weightClass,
          weightLabel: entry.label,
          isItalic,
        };
      }
    }

    return {
      styleName: subfamilyName ?? 'Regular',
      weightClass: 400,
      weightLabel: 'Regular',
      isItalic,
    };
  }
}
