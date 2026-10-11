-- v1.4 part 3 (docs/V14-SPEC.md D29 R7, D30): the seeded IN category
-- «دفعة من عميل» reads «سداد من عميل» — a value, no shape. Only the exact
-- seeded name moves, and only where the establishment has no «سداد من عميل»
-- of that type already (an owner may have made one by hand). Old entries
-- keep the category row, so their history is unchanged.
UPDATE "Category" AS c
SET "nameAr" = 'سداد من عميل'
WHERE c."nameAr" = 'دفعة من عميل'
  AND c."type" = 'IN'
  AND NOT EXISTS (
    SELECT 1 FROM "Category" AS d
    WHERE d."establishmentId" = c."establishmentId"
      AND d."type" = 'IN'
      AND d."nameAr" = 'سداد من عميل'
  );
