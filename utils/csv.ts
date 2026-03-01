import { Person, Relationship } from "@/types";
import JSZip from "jszip";
import Papa from "papaparse";

export async function exportToCsvZip(data: {
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
}): Promise<Blob> {
  const personsCsv = Papa.unparse(data.persons);
  const relationshipsCsv = Papa.unparse(data.relationships);

  const zip = new JSZip();
  zip.file("persons.csv", personsCsv);
  zip.file("relationships.csv", relationshipsCsv);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return zipBlob;
}

export async function parseCsvZip(zipBlob: Blob): Promise<{
  persons: Partial<Person>[];
  relationships: Partial<Relationship>[];
}> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipBlob);

  const personsFile = loadedZip.file("persons.csv");
  const relationshipsFile = loadedZip.file("relationships.csv");

  if (!personsFile || !relationshipsFile) {
    throw new Error(
      "File ZIP không hợp lệ: thiếu persons.csv hoặc relationships.csv.",
    );
  }

  const personsCsvStr = await personsFile.async("text");
  const relationshipsCsvStr = await relationshipsFile.async("text");

  const personsParsed = Papa.parse<Partial<Person>>(personsCsvStr, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true, // Tự động convert số và boolean
  });

  const relationshipsParsed = Papa.parse<Partial<Relationship>>(
    relationshipsCsvStr,
    {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    },
  );

  if (personsParsed.errors.length > 0) {
    console.error("Lỗi parse persons.csv:", personsParsed.errors);
  }

  if (relationshipsParsed.errors.length > 0) {
    console.error("Lỗi parse relationships.csv:", relationshipsParsed.errors);
  }

  return {
    persons: personsParsed.data,
    relationships: relationshipsParsed.data,
  };
}
