export type ProjectStatus = "draft" | "in_progress" | "completed" | "published";

export interface Persona {
  name: string;
  age?: number;
  profession?: string;
  problems?: string[];
  goals?: string[];
  tone?: string;
  description?: string;
}

export interface BrandGuidelines {
  tone?: string;
  forbiddenWords?: string[];
  preferredStyle?: string;
  additionalNotes?: string;
}

export interface StepOutput {
  type: string;
  content: unknown;
  generatedAt: string;
}

export interface TitlesOutput extends StepOutput {
  type: "titles";
  content: {
    titles: string[];
    selectedIndex?: number;
  };
}

export interface TextOutput extends StepOutput {
  type: "text";
  content: {
    text: string;
  };
}

export interface ChoiceOutput extends StepOutput {
  type: "choice";
  content: {
    options: string[];
    selectedIndex?: number;
  };
}

export interface MetaOutput extends StepOutput {
  type: "meta";
  content: {
    titles: string[];
    descriptions: string[];
    selectedTitleIndex?: number;
    selectedDescriptionIndex?: number;
  };
}
