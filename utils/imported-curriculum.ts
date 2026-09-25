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

function normalizePageLink(link: string) {
    return link
        .trim()
        .replace(/[?#].*$/, "")
        .replace(/\/+$/, "")
        .toLowerCase();
}

const importedPagesByLink = new Map(
    importedPages.map((page) => [normalizePageLink(page.link), page]),
);

export function getImportedCurriculumPage(idOrSlug: string) {
    return importedPages.find(
        (page) => String(page.id) === idOrSlug || page.slug === idOrSlug,
    ) ?? null;
}

export function getImportedCurriculumPageByLink(link: string) {
    return importedPagesByLink.get(normalizePageLink(link)) ?? null;
}
