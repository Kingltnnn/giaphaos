export interface KinshipResult {
  /** Person A gọi Person B là gì */
  aCallsB: string;
  /** Person B gọi Person A là gì */
  bCallsA: string;
  /** Mô tả chi tiết nhánh quan hệ */
  description: string;
  /** Số bậc cách nhau */
  distance: number;
  /** Các bước quan hệ chi tiết */
  pathLabels: string[];
}

export interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
}

interface RelEdge {
  type: "marriage" | "biological_child" | "adopted_child" | string;
  person_a: string;
  person_b: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * So sánh thứ bậc giữa hai người (cùng bố mẹ hoặc cùng thế hệ)
 * Ưu tiên: Thứ tự sinh (birth_order) -> Năm sinh (birth_year)
 */
function compareSeniority(
  a: PersonNode,
  b: PersonNode,
): "senior" | "junior" | "equal" {
  if (a.id === b.id) return "equal";

  if (a.birth_order != null && b.birth_order != null) {
    if (a.birth_order < b.birth_order) return "senior";
    if (a.birth_order > b.birth_order) return "junior";
  }

  if (a.birth_year != null && b.birth_year != null) {
    if (a.birth_year < b.birth_year) return "senior";
    if (a.birth_year > b.birth_year) return "junior";
  }

  return "equal";
}

// ── Vietnamese Terminology Constants ──────────────────────────────────────

const ANCESTORS = [
  "",
  "Bố/Mẹ",
  "Ông/Bà",
  "Cụ",
  "Kỵ",
  "Sơ",
  "Tiệm",
  "Tiểu",
  "Di",
  "Diễn",
];
const DESCENDANTS = [
  "",
  "Con",
  "Cháu",
  "Chắt",
  "Chít",
  "Chút",
  "Chét",
  "Chót",
  "Chẹt",
];

/**
 * Lấy danh xưng trực hệ vế trên
 */
function getDirectAncestorTerm(
  depth: number,
  gender: "male" | "female" | "other",
  isPaternal: boolean,
): string {
  if (depth === 1) return gender === "female" ? "Mẹ" : "Bố";
  if (depth === 2) {
    const base = gender === "female" ? "Bà" : "Ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  const title = ANCESTORS[depth] || `Tổ đời ${depth}`;
  if (depth === 3) {
    const base = gender === "female" ? "Cụ bà" : "Cụ ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  return title;
}

/**
 * Lấy danh xưng trực hệ vế dưới
 */
function getDirectDescendantTerm(
  depth: number,
  gender: "male" | "female" | "other",
): string {
  const base = DESCENDANTS[depth] || `Cháu đời ${depth}`;
  const suffix =
    gender === "male" ? " trai" : gender === "female" ? " gái" : "";
  return base + suffix;
}

// ── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Giải quyết danh xưng huyết thống giữa A và B
 */
function resolveBloodTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[], // Từ A lên tới LCA (không bao gồm LCA)
  pathB: PersonNode[], // Từ B lên tới LCA (không bao gồm LCA)
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;

  // 1. QUAN HỆ TRỰC HỆ (A là con cháu B hoặc ngược lại)
  if (depthA === 0) {
    // A chính là LCA. B là con cháu của A.
    // Xác định vế Nội/Ngoại của B đối với A: Dựa vào người con đầu tiên của A trên đường tới B
    const firstChildOfA = pathB[pathB.length - 1];
    if (!firstChildOfA) return ["Hậu duệ", "Tiền bối", "Quan hệ Trực hệ"];

    const isPaternal = firstChildOfA.gender === "male";

    const bCallsA = getDirectAncestorTerm(depthB, genderA, isPaternal);
    const aCallsB = getDirectDescendantTerm(depthB, genderB);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  if (depthB === 0) {
    // B chính là LCA. A là con cháu của B.
    const firstChildOfB = pathA[pathA.length - 1];
    if (!firstChildOfB) return ["Tiền bối", "Hậu duệ", "Quan hệ Trực hệ"];

    const isPaternal = firstChildOfB.gender === "male";

    const aCallsB = getDirectAncestorTerm(depthA, genderB, isPaternal);
    const bCallsA = getDirectDescendantTerm(depthA, genderA);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  // 2. QUAN HỆ NGANG HÀNG (Anh chị em ruột hoặc họ hàng)
  const branchA = pathA[pathA.length - 1]; // Con của LCA phía A
  const branchB = pathB[pathB.length - 1]; // Con của LCA phía B

  if (!branchA || !branchB) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

  const seniority = compareSeniority(branchA, branchB);

  // Xác định vế Nội/Ngoại: Dựa vào giới tính của người ở nhánh A (người đang gọi)
  const isPaternalA = branchA.gender === "male";

  // Anh chị em ruột (Cùng bố mẹ)
  if (depthA === 1 && depthB === 1) {
    const aSenior = compareSeniority(personA, personB);
    if (aSenior === "senior") {
      return [
        genderB === "female" ? "Em gái" : "Em trai",
        genderA === "female" ? "Chị gái" : "Anh trai",
        "Anh chị em ruột",
      ];
    } else {
      return [
        genderB === "female" ? "Chị gái" : "Anh trai",
        genderA === "female" ? "Em gái" : "Em trai",
        "Anh chị em ruột",
      ];
    }
  }

  // Chú/Bác/Cô/Cậu/Dì (Vế trên - Vế dưới)
  if (depthA > 1 && depthB === 1) {
    // B là anh/chị/em của tổ tiên A
    let termForB = "";
    const isPaternalSide = branchA.gender === "male";

    if (isPaternalSide) {
      // Bên Nội (Anh em của bố)
      if (genderB === "female") {
        termForB = "Cô";
      } else {
        termForB = seniority === "senior" ? "Chú" : "Bác";
      }
    } else {
      // Bên Ngoại (Anh em của mẹ)
      if (genderB === "female") {
        termForB = "Dì";
      } else {
        termForB = "Cậu";
      }
    }

    // Nếu cách nhiều đời (ví dụ B là anh của ông nội)
    let prefix = "";
    if (depthA === 3) prefix = genderB === "female" ? "Bà " : "Ông ";
    else if (depthA === 4) prefix = genderB === "female" ? "Cụ bà " : "Cụ ông ";
    else if (depthA > 4) prefix = ANCESTORS[depthA - 1] + " ";

    return [
      (prefix + termForB).trim(),
      getDirectDescendantTerm(depthA, genderA),
      isPaternalSide ? "Bên Nội (Vế trên)" : "Bên Ngoại (Vế trên)",
    ];
  }

  // Ngược lại của trường hợp trên
  if (depthA === 1 && depthB > 1) {
    const [bCallsA, aCallsB, desc] = resolveBloodTerms(
      depthB,
      depthA,
      personB,
      personA,
      pathB,
      pathA,
    );
    return [aCallsB, bCallsA, desc];
  }

  // Anh em họ (Cùng thế hệ hoặc lệch thế hệ nhưng không trực hệ)
  if (depthA > 1 && depthB > 1) {
    const side = isPaternalA ? "Nội" : "Ngoại";

    if (depthA === depthB) {
      // Cùng thế hệ
      if (seniority === "senior") {
        return [
          "Em họ",
          genderA === "female" ? "Chị họ" : "Anh họ",
          `Anh em họ ${side}`,
        ];
      } else {
        return [
          genderB === "female" ? "Chị họ" : "Anh họ",
          "Em họ",
          `Anh em họ ${side}`,
        ];
      }
    } else {
      // Lệch thế hệ
      const genDiff = depthA - depthB;
      if (genDiff > 0) {
        // B ở vế trên
        let termForB = "Họ hàng";
        if (genDiff === 1) {
          const isPaternalSide = branchA.gender === "male";
          if (isPaternalSide) {
            termForB =
              genderB === "female"
                ? "Cô họ"
                : seniority === "senior"
                  ? "Chú họ"
                  : "Bác họ";
          } else {
            termForB = genderB === "female" ? "Dì họ" : "Cậu họ";
          }
        } else {
          termForB = genderB === "female" ? "Bà họ" : "Ông họ";
        }
        return [termForB, "Cháu họ", `Họ hàng ${side}`];
      } else {
        const [bCallsA, aCallsB, desc] = resolveBloodTerms(
          depthB,
          depthA,
          personB,
          personA,
          pathB,
          pathA,
        );
        return [aCallsB, bCallsA, desc];
      }
    }
  }

  return ["Người trong họ", "Người trong họ", "Quan hệ họ hàng"];
}

// ── Data Processing ──────────────────────────────────────────────────────────

function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
) {
  const depths = new Map<string, { depth: number; path: PersonNode[] }>();
  const queue: { id: string; depth: number; path: PersonNode[] }[] = [
    { id, depth: 0, path: [] },
  ];

  while (queue.length > 0) {
    const { id: currentId, depth, path } = queue.shift()!;
    if (!depths.has(currentId)) {
      depths.set(currentId, { depth, path });

      const currentNode = personsMap.get(currentId);
      if (!currentNode) continue;

      const parents = parentMap.get(currentId) ?? [];
      for (const pId of parents) {
        const pNode = personsMap.get(pId);
        if (pNode) {
          // Lưu con đường: từ người gốc lên, path chứa các nút trung gian
          queue.push({
            id: pId,
            depth: depth + 1,
            path: [...path, currentNode],
          });
        }
      }
    }
  }
  return depths;
}

function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
): KinshipResult | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap);
  const ancB = getAncestryData(personB.id, parentMap, personsMap);

  let lcaId: string | null = null;
  let minDistance = Infinity;

  for (const [id, dataA] of ancA) {
    if (ancB.has(id)) {
      const dist = dataA.depth + ancB.get(id)!.depth;
      if (dist < minDistance) {
        minDistance = dist;
        lcaId = id;
      }
    }
  }

  if (!lcaId) return null;

  const dataA = ancA.get(lcaId)!;
  const dataB = ancB.get(lcaId)!;

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
  );

  const lcaName = personsMap.get(lcaId)?.full_name ?? "Tổ tiên chung";
  const pathParts: string[] = [];
  pathParts.push(`${personA.full_name} cách ${lcaName} ${dataA.depth} đời.`);
  pathParts.push(`${personB.full_name} cách ${lcaName} ${dataB.depth} đời.`);

  return {
    aCallsB,
    bCallsA,
    description: `${description} (Tổ tiên chung: ${lcaName})`,
    distance: minDistance,
    pathLabels: pathParts,
  };
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function computeKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      const p = parentMap.get(r.person_b) ?? [];
      p.push(r.person_a);
      parentMap.set(r.person_b, p);
    } else if (r.type === "marriage") {
      const sA = spouseMap.get(r.person_a) ?? [];
      sA.push(r.person_b);
      spouseMap.set(r.person_a, sA);
      const sB = spouseMap.get(r.person_b) ?? [];
      sB.push(r.person_a);
      spouseMap.set(r.person_b, sB);
    }
  }

  // 0. Kiểm tra quan hệ hôn nhân trực tiếp
  const spousesA = spouseMap.get(personA.id) ?? [];
  if (spousesA.includes(personB.id)) {
    return {
      aCallsB: personB.gender === "female" ? "Vợ" : "Chồng",
      bCallsA: personA.gender === "female" ? "Vợ" : "Chồng",
      description: "Quan hệ Hôn nhân",
      distance: 0,
      pathLabels: [`${personA.full_name} và ${personB.full_name} là vợ chồng.`],
    };
  }

  // 1. Kiểm tra quan hệ huyết thống
  const blood = findBloodKinship(personA, personB, personsMap, parentMap);
  if (blood) return blood;

  // 2. Kiểm tra quan hệ thông qua hôn nhân của A
  for (const sId of spousesA) {
    if (sId === personB.id) continue; // Đã xử lý ở bước 0
    const spouseA = personsMap.get(sId);
    if (!spouseA) continue;
    const res = findBloodKinship(spouseA, personB, personsMap, parentMap);
    if (res) {
      let aCallsB = res.aCallsB;
      let bCallsA = res.bCallsA;

      // Chuyển đổi danh xưng cho dâu/rể/thím/mợ...
      if (res.bCallsA === "Con") {
        bCallsA = personA.gender === "male" ? "Con rể" : "Con dâu";
      } else if (res.bCallsA === "Con gái") {
        // personA là bố/mẹ của spouseB, spouseB là vợ của personB
        bCallsA = "Con rể";
        aCallsB = personB.gender === "male" ? "Bố vợ" : "Mẹ vợ";
      } else if (res.bCallsA === "Con trai") {
        // personA là bố/mẹ của spouseB, spouseB là chồng của personB
        bCallsA = "Con dâu";
        aCallsB = personB.gender === "male" ? "Bố chồng" : "Mẹ chồng";
      } else if (res.bCallsA === "Cháu") {
        bCallsA = personA.gender === "male" ? "Cháu rể" : "Cháu dâu";
      } else if (res.bCallsA.includes("Anh trai")) {
        bCallsA = "Anh rể";
      } else if (res.bCallsA.includes("Chị gái")) {
        bCallsA = "Chị dâu";
      } else if (res.bCallsA.includes("Em")) {
        bCallsA = personA.gender === "male" ? "Em rể" : "Em dâu";
      } else if (
        res.bCallsA === "Chú" ||
        res.bCallsA === "Cậu" ||
        res.bCallsA.includes("Dượng")
      ) {
        bCallsA = "Dượng";
      } else if (
        res.bCallsA === "Cô" ||
        res.bCallsA === "Dì" ||
        res.bCallsA.includes("Thím") ||
        res.bCallsA.includes("Mợ")
      ) {
        bCallsA =
          spouseA.gender === "male"
            ? res.bCallsA === "Chú"
              ? "Thím"
              : "Mợ"
            : "Dượng";
      }

      // Ngược lại A gọi B
      if (res.aCallsB === "Chú") aCallsB = "Chú";
      else if (res.aCallsB === "Cô") aCallsB = "Cô";
      else if (res.aCallsB === "Cậu") aCallsB = "Cậu";
      else if (res.aCallsB === "Dì") aCallsB = "Dì";

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseA.full_name}`,
        pathLabels: [
          `${personA.full_name} là vợ/chồng của ${spouseA.full_name}`,
          ...res.pathLabels,
        ],
      };
    }
  }

  // 3. Kiểm tra quan hệ thông qua hôn nhân của B
  const spousesB = spouseMap.get(personB.id) ?? [];
  for (const sId of spousesB) {
    const spouseB = personsMap.get(sId);
    if (!spouseB) continue;
    const res = findBloodKinship(personA, spouseB, personsMap, parentMap);
    if (res) {
      let aCallsB = res.aCallsB;
      let bCallsA = res.bCallsA;

      if (res.aCallsB === "Con") {
        aCallsB = personB.gender === "male" ? "Con rể" : "Con dâu";
      } else if (res.aCallsB === "Con gái") {
        // personA là bố/mẹ của spouseB, spouseB là chồng của personB
        aCallsB = "Con rể";
        bCallsA = personA.gender === "male" ? "Bố vợ" : "Mẹ vợ";
      } else if (res.aCallsB === "Con trai") {
        // personA là bố/mẹ của spouseB, spouseB là vợ của personB
        aCallsB = "Con dâu";
        bCallsA = personA.gender === "male" ? "Bố chồng" : "Mẹ chồng";
      } else if (res.aCallsB === "Cháu") {
        aCallsB = personB.gender === "male" ? "Cháu rể" : "Cháu dâu";
      } else if (res.aCallsB.includes("Anh trai")) {
        aCallsB = "Anh rể";
      } else if (res.aCallsB.includes("Chị gái")) {
        aCallsB = "Chị dâu";
      } else if (res.aCallsB.includes("Em")) {
        aCallsB = personB.gender === "male" ? "Em rể" : "Em dâu";
      } else if (res.aCallsB === "Chú" || res.aCallsB === "Cậu") {
        aCallsB =
          spouseB.gender === "male"
            ? "Dượng"
            : res.aCallsB === "Chú"
              ? "Thím"
              : "Mợ";
      }

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân của ${spouseB.full_name}`,
        pathLabels: [
          ...res.pathLabels,
          `${personB.full_name} là vợ/chồng của ${spouseB.full_name}`,
        ],
      };
    }
  }

  return {
    aCallsB: "Chưa xác định",
    bCallsA: "Chưa xác định",
    description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
    distance: -1,
    pathLabels: [],
  };
}
