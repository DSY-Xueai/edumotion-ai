import { dictionary } from "cmu-pronouncing-dictionary";

const consonantIpa: Record<string, string> = {
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "ɡ",
  HH: "h",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "r",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};

const vowelIpa = (phone: string, stress: string | undefined) => {
  if (phone === "AH" && stress === "0") {
    return "ə";
  }

  if (phone === "ER" && stress === "0") {
    return "ɚ";
  }

  const vowels: Record<string, string> = {
    AA: "ɑ",
    AE: "æ",
    AH: "ʌ",
    AO: "ɔ",
    AW: "aʊ",
    AY: "aɪ",
    EH: "ɛ",
    ER: "ɝ",
    EY: "eɪ",
    IH: "ɪ",
    IY: stress === "0" ? "i" : "iː",
    OW: "oʊ",
    OY: "ɔɪ",
    UH: "ʊ",
    UW: "uː",
  };

  return vowels[phone];
};

export const arpabetToIpa = (arpabet: string) => {
  let ipa = "";
  let consonantBuffer = "";

  for (const rawPhone of arpabet.split(/\s+/u).filter(Boolean)) {
    const match = rawPhone.match(/^([A-Z]+)([0-2])?$/u);
    const phone = match?.[1] ?? rawPhone;
    const stress = match?.[2];
    const vowel = vowelIpa(phone, stress);

    if (vowel) {
      if (stress === "1" || stress === "2") {
        ipa += `${stress === "1" ? "ˈ" : "ˌ"}${consonantBuffer}${vowel}`;
      } else {
        ipa += `${consonantBuffer}${vowel}`;
      }
      consonantBuffer = "";
      continue;
    }

    consonantBuffer += consonantIpa[phone] ?? phone.toLowerCase();
  }

  return ipa + consonantBuffer;
};

export const resolveEnglishPhonetic = ({
  word,
  sourcePhonetic,
}: {
  word: string;
  sourcePhonetic?: string;
}) => {
  const trimmedSource = sourcePhonetic?.trim();

  if (trimmedSource) {
    return trimmedSource;
  }

  const arpabet = dictionary[word.trim().toLowerCase()];

  return arpabet ? `/${arpabetToIpa(arpabet)}/` : "";
};
