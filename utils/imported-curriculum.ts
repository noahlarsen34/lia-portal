import pages from "@/data/curriculum/wordpress-pages.json";

type ImportedCurriculumPage = {
    id: number;
    title: string;
    slug: string;
    link: string;
    type: string;
    status: string;
    parentId: number;
    menuOrder: number;
    content: string;
};

const importedPages = pages as ImportedCurriculumPage[];

export function getImportedCurriculumPage(idOrSlug: string) {
    return importedPages.find(
        (page) => String(page.id) === idOrSlug || page.slug === idOrSlug,
    ) ?? null;
}
