import React, { useEffect, useState, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Button,
  Dropdown,
  DropdownButton,
  Form,
  Col,
  Row,
  ButtonGroup,
} from "react-bootstrap";
import Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import * as yup from "yup";
import {
  queryScrapeScene,
  queryScrapeSceneURL,
  useListSceneScrapers,
  mutateReloadScrapers,
  queryScrapeSceneQueryFragment,
} from "src/core/StashService";
import {
  TagSelect,
  StudioSelect,
  GallerySelect,
  MovieSelect,
} from "src/components/Shared/Select";
import { Icon } from "src/components/Shared/Icon";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { ImageInput } from "src/components/Shared/ImageInput";
import { URLListInput } from "src/components/Shared/URLField";
import { useToast } from "src/hooks/Toast";
import ImageUtils from "src/utils/image";
import FormUtils from "src/utils/form";
import { getStashIDs } from "src/utils/stashIds";
import { useFormik } from "formik";
import { Prompt } from "react-router-dom";
import { ConfigurationContext } from "src/hooks/Config";
import { stashboxDisplayName } from "src/utils/stashbox";
import { SceneMovieTable } from "./SceneMovieTable";
import { RatingSystem } from "src/components/Shared/Rating/RatingSystem";
import {
  faSearch,
  faSyncAlt,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { objectTitle } from "src/core/files";
import { galleryTitle } from "src/core/galleries";
import { useRatingKeybinds } from "src/hooks/keybinds";
import { lazyComponent } from "src/utils/lazyComponent";
import isEqual from "lodash-es/isEqual";
import { DateInput } from "src/components/Shared/DateInput";
import { yupDateString, yupUniqueStringList } from "src/utils/yup";
import {
  Performer,
  PerformerSelect,
} from "src/components/Performers/PerformerSelect";
import { SceneCustomMarker } from "./SceneCustomMarker";

const SceneScrapeDialog = lazyComponent(() => import("./SceneScrapeDialog"));
const SceneQueryModal = lazyComponent(() => import("./SceneQueryModal"));

interface IProps {
  scene: Partial<GQL.SceneDataFragment>;
  initialCoverImage?: string;
  isNew?: boolean;
  isVisible: boolean;
  onSubmit: (input: GQL.SceneCreateInput) => Promise<void>;
  onDelete?: () => void;
}

export const SceneEditPanel: React.FC<IProps> = ({
  scene,
  initialCoverImage,
  isNew = false,
  isVisible,
  onSubmit,
  onDelete,
}) => {
  const intl = useIntl();
  const Toast = useToast();

  const [galleries, setGalleries] = useState<{ id: string; title: string }[]>(
    []
  );
  const [performers, setPerformers] = useState<Performer[]>([]);

  const Scrapers = useListSceneScrapers();
  const [fragmentScrapers, setFragmentScrapers] = useState<GQL.Scraper[]>([]);
  const [queryableScrapers, setQueryableScrapers] = useState<GQL.Scraper[]>([]);

  const [scraper, setScraper] = useState<GQL.ScraperSourceInput>();
  const [isScraperQueryModalOpen, setIsScraperQueryModalOpen] =
    useState<boolean>(false);
  const [scrapedScene, setScrapedScene] = useState<GQL.ScrapedScene | null>();
  const [endpoint, setEndpoint] = useState<string>();

  useEffect(() => {
    setGalleries(
      scene.galleries?.map((g) => ({
        id: g.id,
        title: galleryTitle(g),
      })) ?? []
    );
  }, [scene.galleries]);

  useEffect(() => {
    setPerformers(scene.performers ?? []);
  }, [scene.performers]);

  const { configuration: stashConfig } = React.useContext(ConfigurationContext);

  // Network state
  const [isLoading, setIsLoading] = useState(false);

  const [customDirty, setCustomDirty] = useState(false);
  const [makeDirty, setMakeDirty] = useState(false);

  const schema = yup.object({
    title: yup.string().ensure(),
    code: yup.string().ensure(),
    urls: yupUniqueStringList("urls"),
    date: yupDateString(intl),
    director: yup.string().ensure(),
    rating100: yup.number().nullable().defined(),
    gallery_ids: yup.array(yup.string().required()).defined(),
    studio_id: yup.string().required().nullable(),
    performer_ids: yup.array(yup.string().required()).defined(),
    movies: yup
      .array(
        yup.object({
          movie_id: yup.string().required(),
          scene_index: yup.number().nullable().defined(),
        })
      )
      .defined(),
    tag_ids: yup.array(yup.string().required()).defined(),
    stash_ids: yup.mixed<GQL.StashIdInput[]>().defined(),
    details: yup.string().ensure(),
    cover_image: yup.string().nullable().optional(),
  });

  const initialValues = useMemo(
    () => ({
      title: scene.title ?? "",
      code: scene.code ?? "",
      urls: scene.urls ?? [],
      date: scene.date ?? "",
      director: scene.director ?? "",
      rating100: scene.rating100 ?? null,
      gallery_ids: (scene.galleries ?? []).map((g) => g.id),
      studio_id: scene.studio?.id ?? null,
      performer_ids: (scene.performers ?? []).map((p) => p.id),
      movies: (scene.movies ?? []).map((m) => {
        return { movie_id: m.movie.id, scene_index: m.scene_index ?? null };
      }),
      tag_ids: (scene.tags ?? []).map((t) => t.id),
      stash_ids: getStashIDs(scene.stash_ids),
      details: scene.details ?? "",
      cover_image: initialCoverImage,
    }),
    [scene, initialCoverImage]
  );

  type InputValues = yup.InferType<typeof schema>;

  const formik = useFormik<InputValues>({
    initialValues,
    enableReinitialize: true,
    validationSchema: schema,
    onSubmit: (values) => onSave(values),
  });

  const coverImagePreview = useMemo(() => {
    const sceneImage = scene.paths?.screenshot;
    const formImage = formik.values.cover_image;
    if (formImage === null && sceneImage) {
      const sceneImageURL = new URL(sceneImage);
      sceneImageURL.searchParams.set("default", "true");
      return sceneImageURL.toString();
    } else if (formImage) {
      return formImage;
    }
    return sceneImage;
  }, [formik.values.cover_image, scene.paths?.screenshot]);

  useEffect(() => {
    if(formik.dirty || makeDirty) {
      setCustomDirty(true);
    }
    else {
      setCustomDirty(false);
    } 
  }, [formik]);

  function setRating(v: number) {
    formik.setFieldValue("rating100", v);
  }

  interface IGallerySelectValue {
    id: string;
    title: string;
  }

  function onSetGalleries(items: IGallerySelectValue[]) {
    setGalleries(items);
    formik.setFieldValue(
      "gallery_ids",
      items.map((i) => i.id)
    );
  }

  function onSetPerformers(items: Performer[]) {
    setPerformers(items);
    formik.setFieldValue(
      "performer_ids",
      items.map((item) => item.id)
    );
  }

  useRatingKeybinds(
    isVisible,
    stashConfig?.ui?.ratingSystemOptions?.type,
    setRating
  );

  useEffect(() => {
    if (isVisible) {
      Mousetrap.bind("s s", () => {
        if (formik.dirty) {
          formik.submitForm();
        }
      });
      Mousetrap.bind("d d", () => {
        if (onDelete) {
          onDelete();
        }
      });

      return () => {
        Mousetrap.unbind("s s");
        Mousetrap.unbind("d d");
      };
    }
  });

  useEffect(() => {
    const toFilter = Scrapers?.data?.listSceneScrapers ?? [];

    const newFragmentScrapers = toFilter.filter((s) =>
      s.scene?.supported_scrapes.includes(GQL.ScrapeType.Fragment)
    );
    const newQueryableScrapers = toFilter.filter((s) =>
      s.scene?.supported_scrapes.includes(GQL.ScrapeType.Name)
    );

    setFragmentScrapers(newFragmentScrapers);
    setQueryableScrapers(newQueryableScrapers);
  }, [Scrapers, stashConfig]);

  function setMovieIds(movieIds: string[]) {
    const existingMovies = formik.values.movies;

    const newMovies = movieIds.map((m) => {
      const existing = existingMovies.find((mm) => mm.movie_id === m);
      if (existing) {
        return existing;
      }

      return {
        movie_id: m,
        scene_index: null,
      };
    });

    formik.setFieldValue("movies", newMovies);
  }

  async function onSave(input: InputValues) {
    setIsLoading(true);
    try {
      await onSubmit(input);
      formik.resetForm();
    } catch (e) {
      Toast.error(e);
    }
    setIsLoading(false);
    setMakeDirty(false);
  }

  const removeStashID = (stashID: GQL.StashIdInput) => {
    formik.setFieldValue(
      "stash_ids",
      formik.values.stash_ids.filter(
        (s) =>
          !(s.endpoint === stashID.endpoint && s.stash_id === stashID.stash_id)
      )
    );
  };

  const getCurrentTagIds = () => {
    const values = formik.values;
    return values.tag_ids;
    }

/*
ORGANIZED - S - 345
ORGANIZED - SPP - 346
PERFORMER - Pornstar - 1
PERFORMER - Amateur - 7
PERFORMER - White - 82
PERFORMER - Black - 102
PERFORMER - Lightskin - 244
PERFORMER - Asian - 49
PERFORMER - Indian - 189
PERFORMER - Hispanic - 93
PERFORMER - Middle Eastern - 67
PERFORMER - Blonde - 9
PERFORMER - Brunette - 18
PERFORMER - Redhead - 28
PICTURE - Clothed - 75
PICTURE - Tits - Clothed - 73
PICTURE - Nude - 76
PICTURE - Tits - Nude - 72
PICTURE - Bikini - 70
PICTURE - TIGHT - 161
*/

  const handleCustomTags = (tag: string) => {
    const currentIds = getCurrentTagIds();

    switch(tag) {
      case 'organized-s':
        currentIds.push("345");
        break;
      case 'organized-spp':
        currentIds.push("346");
        break;
      case 'stashdbchecked': 
        currentIds.push("594");
        break;
      case 'horizontal': 
        currentIds.push("5");
        break;
      case 'horizvert':
        currentIds.push("5", "6");
        break;
      case 'vert':
        currentIds.push("6");
        break;
      case 'pornstar':
        currentIds.push("1");
        break;
      case 'amateur':
        currentIds.push("7");
        break;
      case 'white':
        currentIds.push("2");
        break;
      case 'black':
        currentIds.push("102");
        break;
      case 'lightskin':
        currentIds.push("244");
        break;
      case 'asian':
        currentIds.push("49");
        break;
      case 'indian':
        currentIds.push("189");
        break;
      case 'hispanic':
        currentIds.push("93");
        break;
      case 'middle-eastern':
        currentIds.push("67");
        break;
      case 'blonde':
        currentIds.push("9");
        break;
        case 'brunette':
          currentIds.push("18");
          break;
          case 'redhead':
            currentIds.push("28");
            break;
            case 'clothed':
              currentIds.push("75");
              break;
              case 'tclothed':
                currentIds.push("73");
                break;
                case 'nude':
                  currentIds.push("76");
                  break;
                  case 'tnude':
                    currentIds.push("72");
                    break;
                    case 'bikini':
                      currentIds.push("70");
                      break;
                      case 'tight':
                        currentIds.push("161");
                        break;
                        case 'bj':
                          currentIds.push("12");
                          break;
                          case 'hj':
                            currentIds.push("8");
                            break;
                            case 'cg':
                              currentIds.push("27");
                              break;
                              case 'rcg':
                                currentIds.push("25");
                                break;
                                case 'doggy':
                                  currentIds.push("38");
                                  break;
                                  case 'missionary':
                                    currentIds.push("17");
                                    break;
                                    case 'ass':
                                      currentIds.push("69");
                                      break;
                                      case 'underwear':
                                        currentIds.push("204");
                                        break;
                                        case 'celeb':
                                          currentIds.push("90");
                                          break;
                                          case 'darkhair':
                                            currentIds.push("48");
                                            break;
                                            case 'titjob':
                                              currentIds.push("35");
                                              break;
                                            case 'smalldick':
                                              currentIds.push("334");
                                              break;
                                              case 'bigdick':
                                                currentIds.push("45");
                                                break;
                                                case 'hugedick':
                                                  currentIds.push("228");
                                                  break;
                                                  case 'bigtits':
                                                    currentIds.push("4");
                                                    break;
                                                    case 'hugetits':
                                                      currentIds.push("241");
                                                      break;
                                                    case 'interracial':
                                                      currentIds.push("11");
                                                      break;
    }
    formik.setFieldValue("tag_ids", currentIds);
    setMakeDirty(true);
    }

  function renderTableMovies() {
    return (
      <SceneMovieTable
        movieScenes={formik.values.movies}
        onUpdate={(items) => {
          formik.setFieldValue("movies", items);
        }}
      />
    );
  }

  const encodingImage = ImageUtils.usePasteImage(onImageLoad);

  function onImageLoad(imageData: string) {
    formik.setFieldValue("cover_image", imageData);
  }

  function onCoverImageChange(event: React.FormEvent<HTMLInputElement>) {
    ImageUtils.onImageChange(event, onImageLoad);
  }

  async function onScrapeClicked(s: GQL.ScraperSourceInput) {
    setIsLoading(true);
    try {
      const result = await queryScrapeScene(s, scene.id!);
      if (!result.data || !result.data.scrapeSingleScene?.length) {
        Toast.success({
          content: "No scenes found",
        });
        return;
      }
      // assume one returned scene
      setScrapedScene(result.data.scrapeSingleScene[0]);
      setEndpoint(s.stash_box_endpoint ?? undefined);
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function scrapeFromQuery(
    s: GQL.ScraperSourceInput,
    fragment: GQL.ScrapedSceneDataFragment
  ) {
    setIsLoading(true);
    try {
      const input: GQL.ScrapedSceneInput = {
        date: fragment.date,
        code: fragment.code,
        details: fragment.details,
        director: fragment.director,
        remote_site_id: fragment.remote_site_id,
        title: fragment.title,
        urls: fragment.urls,
      };

      const result = await queryScrapeSceneQueryFragment(s, input);
      if (!result.data || !result.data.scrapeSingleScene?.length) {
        Toast.success({
          content: "No scenes found",
        });
        return;
      }
      // assume one returned scene
      setScrapedScene(result.data.scrapeSingleScene[0]);
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function onScrapeQueryClicked(s: GQL.ScraperSourceInput) {
    setScraper(s);
    setEndpoint(s.stash_box_endpoint ?? undefined);
    setIsScraperQueryModalOpen(true);
  }

  async function onReloadScrapers() {
    setIsLoading(true);
    try {
      await mutateReloadScrapers();

      // reload the performer scrapers
      await Scrapers.refetch();
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function onScrapeDialogClosed(sceneData?: GQL.ScrapedSceneDataFragment) {
    if (sceneData) {
      updateSceneFromScrapedScene(sceneData);
    }
    setScrapedScene(undefined);
  }

  function maybeRenderScrapeDialog() {
    if (!scrapedScene) {
      return;
    }

    const currentScene = {
      id: scene.id!,
      ...formik.values,
    };

    if (!currentScene.cover_image) {
      currentScene.cover_image = scene.paths?.screenshot;
    }

    return (
      <SceneScrapeDialog
        scene={currentScene}
        scenePerformers={performers}
        scraped={scrapedScene}
        endpoint={endpoint}
        onClose={(s) => onScrapeDialogClosed(s)}
      />
    );
  }

  function renderScrapeQueryMenu() {
    const stashBoxes = stashConfig?.general.stashBoxes ?? [];

    if (stashBoxes.length === 0 && queryableScrapers.length === 0) return;

    return (
      <Dropdown title={intl.formatMessage({ id: "actions.scrape_query" })}>
        <Dropdown.Toggle variant="secondary">
          <Icon icon={faSearch} />
        </Dropdown.Toggle>

        <Dropdown.Menu>
          {stashBoxes.map((s, index) => (
            <Dropdown.Item
              key={s.endpoint}
              onClick={() =>
                onScrapeQueryClicked({
                  stash_box_index: index,
                  stash_box_endpoint: s.endpoint,
                })
              }
            >
              {stashboxDisplayName(s.name, index)}
            </Dropdown.Item>
          ))}
          {queryableScrapers.map((s) => (
            <Dropdown.Item
              key={s.name}
              onClick={() => onScrapeQueryClicked({ scraper_id: s.id })}
            >
              {s.name}
            </Dropdown.Item>
          ))}
          <Dropdown.Item onClick={() => onReloadScrapers()}>
            <span className="fa-icon">
              <Icon icon={faSyncAlt} />
            </span>
            <span>
              <FormattedMessage id="actions.reload_scrapers" />
            </span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  function onSceneSelected(s: GQL.ScrapedSceneDataFragment) {
    if (!scraper) return;

    if (scraper?.stash_box_index !== undefined) {
      // must be stash-box - assume full scene
      setScrapedScene(s);
    } else {
      // must be scraper
      scrapeFromQuery(scraper, s);
    }
  }

  const renderScrapeQueryModal = () => {
    if (!isScraperQueryModalOpen || !scraper) return;

    return (
      <SceneQueryModal
        scraper={scraper}
        onHide={() => setScraper(undefined)}
        onSelectScene={(s) => {
          setIsScraperQueryModalOpen(false);
          setScraper(undefined);
          onSceneSelected(s);
        }}
        name={formik.values.title || objectTitle(scene) || ""}
      />
    );
  };

  function renderScraperMenu() {
    const stashBoxes = stashConfig?.general.stashBoxes ?? [];

    return (
      <DropdownButton
        className="d-inline-block"
        id="scene-scrape"
        title={intl.formatMessage({ id: "actions.scrape_with" })}
      >
        {stashBoxes.map((s, index) => (
          <Dropdown.Item
            key={s.endpoint}
            onClick={() =>
              onScrapeClicked({
                stash_box_index: index,
                stash_box_endpoint: s.endpoint,
              })
            }
          >
            {stashboxDisplayName(s.name, index)}
          </Dropdown.Item>
        ))}
        {fragmentScrapers.map((s) => (
          <Dropdown.Item
            key={s.name}
            onClick={() => onScrapeClicked({ scraper_id: s.id })}
          >
            {s.name}
          </Dropdown.Item>
        ))}
        <Dropdown.Item onClick={() => onReloadScrapers()}>
          <span className="fa-icon">
            <Icon icon={faSyncAlt} />
          </span>
          <span>
            <FormattedMessage id="actions.reload_scrapers" />
          </span>
        </Dropdown.Item>
      </DropdownButton>
    );
  }

  function urlScrapable(scrapedUrl: string): boolean {
    return (Scrapers?.data?.listSceneScrapers ?? []).some((s) =>
      (s?.scene?.urls ?? []).some((u) => scrapedUrl.includes(u))
    );
  }

  function updateSceneFromScrapedScene(
    updatedScene: GQL.ScrapedSceneDataFragment
  ) {
    if (updatedScene.title) {
      formik.setFieldValue("title", updatedScene.title);
    }

    if (updatedScene.code) {
      formik.setFieldValue("code", updatedScene.code);
    }

    if (updatedScene.details) {
      formik.setFieldValue("details", updatedScene.details);
    }

    if (updatedScene.director) {
      formik.setFieldValue("director", updatedScene.director);
    }

    if (updatedScene.date) {
      formik.setFieldValue("date", updatedScene.date);
    }

    if (updatedScene.urls) {
      formik.setFieldValue("urls", updatedScene.urls);
    }

    if (updatedScene.studio && updatedScene.studio.stored_id) {
      formik.setFieldValue("studio_id", updatedScene.studio.stored_id);
    }

    if (updatedScene.performers && updatedScene.performers.length > 0) {
      const idPerfs = updatedScene.performers.filter((p) => {
        return p.stored_id !== undefined && p.stored_id !== null;
      });

      if (idPerfs.length > 0) {
        onSetPerformers(
          idPerfs.map((p) => {
            return {
              id: p.stored_id!,
              name: p.name ?? "",
              alias_list: [],
            };
          })
        );
      }
    }

    if (updatedScene.movies && updatedScene.movies.length > 0) {
      const idMovis = updatedScene.movies.filter((p) => {
        return p.stored_id !== undefined && p.stored_id !== null;
      });

      if (idMovis.length > 0) {
        const newIds = idMovis.map((p) => p.stored_id);
        setMovieIds(newIds as string[]);
      }
    }

    if (updatedScene?.tags?.length) {
      const idTags = updatedScene.tags.filter((p) => {
        return p.stored_id !== undefined && p.stored_id !== null;
      });

      if (idTags.length > 0) {
        const newIds = idTags.map((p) => p.stored_id);
        formik.setFieldValue("tag_ids", newIds as string[]);
      }
    }

    if (updatedScene.image) {
      // image is a base64 string
      formik.setFieldValue("cover_image", updatedScene.image);
    }

    if (updatedScene.remote_site_id && endpoint) {
      let found = false;
      formik.setFieldValue(
        "stash_ids",
        formik.values.stash_ids.map((s) => {
          if (s.endpoint === endpoint) {
            found = true;
            return {
              endpoint,
              stash_id: updatedScene.remote_site_id,
            };
          }

          return s;
        })
      );

      if (!found) {
        formik.setFieldValue(
          "stash_ids",
          formik.values.stash_ids.concat({
            endpoint,
            stash_id: updatedScene.remote_site_id,
          })
        );
      }
    }
  }

  async function onScrapeSceneURL(url: string) {
    if (!url) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await queryScrapeSceneURL(url);
      if (!result.data || !result.data.scrapeSceneURL) {
        return;
      }
      setScrapedScene(result.data.scrapeSceneURL);
    } catch (e) {
      Toast.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function renderTextField(field: string, title: string, placeholder?: string) {
    return (
      <Form.Group controlId={field} as={Row}>
        {FormUtils.renderLabel({
          title,
        })}
        <Col xs={9}>
          <Form.Control
            className="text-input"
            placeholder={placeholder ?? title}
            {...formik.getFieldProps(field)}
            isInvalid={!!formik.getFieldMeta(field).error}
          />
          <Form.Control.Feedback type="invalid">
            {formik.getFieldMeta(field).error}
          </Form.Control.Feedback>
        </Col>
      </Form.Group>
    );
  }

  const image = useMemo(() => {
    if (encodingImage) {
      return (
        <LoadingIndicator
          message={`${intl.formatMessage({ id: "encoding_image" })}...`}
        />
      );
    }

    if (coverImagePreview) {
      return (
        <img
          className="scene-cover"
          src={coverImagePreview}
          alt={intl.formatMessage({ id: "cover_image" })}
        />
      );
    }

    return <div></div>;
  }, [encodingImage, coverImagePreview, intl]);

  if (isLoading) return <LoadingIndicator />;

  const urlsErrors = Array.isArray(formik.errors.urls)
    ? formik.errors.urls[0]
    : formik.errors.urls;
  const urlsErrorMsg = urlsErrors
    ? intl.formatMessage({ id: "validation.urls_must_be_unique" })
    : undefined;
  const urlsErrorIdx = urlsErrors?.split(" ").map((e) => parseInt(e));

  return (
    <div id="scene-edit-details">
      <Prompt
        when={customDirty}
        message={intl.formatMessage({ id: "dialogs.unsaved_changes" })}
      />

      {renderScrapeQueryModal()}
      {maybeRenderScrapeDialog()}
      <Form noValidate onSubmit={formik.handleSubmit}>
        <div className="form-container edit-buttons-container row px-3 pt-3">
          <div className="edit-buttons mb-3 pl-0">
            <Button
              className="edit-button"
              variant="primary"
              disabled={
                (!isNew && !customDirty) || !isEqual(formik.errors, {})
              }
              onClick={() => formik.submitForm()}
            >
              <FormattedMessage id="actions.save" />
            </Button>
            {onDelete && (
              <Button
                className="edit-button"
                variant="danger"
                onClick={() => onDelete()}
              >
                <FormattedMessage id="actions.delete" />
              </Button>
            )}
          </div>
          {!isNew && (
            <div className="ml-auto pr-3 text-right d-flex">
              <ButtonGroup className="scraper-group">
                {renderScraperMenu()}
                {renderScrapeQueryMenu()}
              </ButtonGroup>
            </div>
          )}
        </div>
        <div className="form-container row px-3">
          <div className="col-12 col-lg-7 col-xl-12">
            {renderTextField("title", intl.formatMessage({ id: "title" }))}
            {renderTextField("code", intl.formatMessage({ id: "scene_code" }))}
            <Form.Group controlId="urls" as={Row}>
              <Col xs={3} className="pr-0 url-label">
                <Form.Label className="col-form-label">
                  <FormattedMessage id="urls" />
                </Form.Label>
              </Col>
              <Col xs={9}>
                <URLListInput
                  value={formik.values.urls ?? []}
                  setValue={(value) => formik.setFieldValue("urls", value)}
                  errors={urlsErrorMsg}
                  errorIdx={urlsErrorIdx}
                  onScrapeClick={(url) => onScrapeSceneURL(url)}
                  urlScrapable={urlScrapable}
                />
              </Col>
            </Form.Group>
            <Form.Group controlId="date" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "date" }),
              })}
              <Col xs={9}>
                <DateInput
                  value={formik.values.date}
                  onValueChange={(value) => formik.setFieldValue("date", value)}
                  error={formik.errors.date}
                />
              </Col>
            </Form.Group>
            {renderTextField(
              "director",
              intl.formatMessage({ id: "director" })
            )}
            <Form.Group controlId="rating" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "rating" }),
              })}
              <Col xs={9}>
                <RatingSystem
                  value={formik.values.rating100 ?? undefined}
                  onSetRating={(value) =>
                    formik.setFieldValue("rating100", value ?? null)
                  }
                />
              </Col>
            </Form.Group>
            <Form.Group controlId="galleries" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "galleries" }),
                labelProps: {
                  column: true,
                  sm: 3,
                },
              })}
              <Col sm={9}>
                <GallerySelect
                  selected={galleries}
                  onSelect={(items) => onSetGalleries(items)}
                  isMulti
                />
              </Col>
            </Form.Group>
            <Form.Group controlId="studio" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "studio" }),
                labelProps: {
                  column: true,
                  sm: 3,
                },
              })}
              <Col sm={9}>
                <StudioSelect
                  onSelect={(items) =>
                    formik.setFieldValue(
                      "studio_id",
                      items.length > 0 ? items[0]?.id : null
                    )
                  }
                  ids={formik.values.studio_id ? [formik.values.studio_id] : []}
                />
              </Col>
            </Form.Group>
            <Form.Group controlId="performers" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "performers" }),
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <PerformerSelect
                  isMulti
                  onSelect={onSetPerformers}
                  values={performers}
                />
              </Col>
            </Form.Group>
            <Form.Group controlId="moviesScenes" as={Row}>
              {FormUtils.renderLabel({
                title: `${intl.formatMessage({
                  id: "movies",
                })}/${intl.formatMessage({ id: "scenes" })}`,
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <MovieSelect
                  isMulti
                  onSelect={(items) =>
                    setMovieIds(items.map((item) => item.id))
                  }
                  ids={formik.values.movies.map((m) => m.movie_id)}
                />
                {renderTableMovies()}
              </Col>
            </Form.Group>
            <Form.Group controlId="customtags" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "Custom Tags" }),
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <div style={{display: 'grid', rowGap: '0.5em', height: '0.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001%'}}>
                  <div className='item1'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                      <div onClick={() => handleCustomTags('organized-s')}>
                        <SceneCustomMarker 
                          icon="organizeds"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('stashdbchecked')}>
                        <SceneCustomMarker 
                          icon="stashdbchecked"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('organized-spp')}>
                        <SceneCustomMarker 
                          icon="organizedspp"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item2'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('horizontal')}>
                        <SceneCustomMarker 
                          icon="horizontal"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('horizvert')}>
                        <SceneCustomMarker 
                          icon="horizvert"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('vert')}>
                        <SceneCustomMarker 
                          icon="vert"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={'rotate(90deg)'}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item3'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('pornstar')}>
                        <SceneCustomMarker 
                          icon="pornstar"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('amateur')}>
                        <SceneCustomMarker 
                          icon="amateur"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('celeb')}>
                        <SceneCustomMarker 
                          icon="celeb"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item4'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('indian')}>
                        <SceneCustomMarker 
                          icon="indian"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('middle-eastern')}>
                        <SceneCustomMarker 
                          icon="middle-eastern"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('hispanic')}>
                        <SceneCustomMarker 
                          icon="hispanic"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    <div onClick={() => handleCustomTags('white')}>
                        <SceneCustomMarker 
                          icon="white"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('asian')}>
                        <SceneCustomMarker 
                          icon="asian"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('lightskin')}>
                        <SceneCustomMarker 
                          icon="lightskin"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('black')}>
                        <SceneCustomMarker 
                          icon="black"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item5'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('blonde')}>
                        <SceneCustomMarker 
                          icon="blonde"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('brunette')}>
                        <SceneCustomMarker 
                          icon="brunette"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('redhead')}>
                        <SceneCustomMarker 
                          icon="redhead"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('darkhair')}>
                        <SceneCustomMarker 
                          icon="black"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item6'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('clothed')}>
                        <SceneCustomMarker 
                          icon="clothed"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('tclothed')}>
                        <SceneCustomMarker 
                          icon="tclothed"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('nude')}>
                        <SceneCustomMarker 
                          icon="nude"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('tnude')}>
                        <SceneCustomMarker 
                          icon="tnude"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item7'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                      <div onClick={() => handleCustomTags('smalldick')}>
                        <SceneCustomMarker 
                          icon="smalldick"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('bigdick')}>
                        <SceneCustomMarker 
                          icon="bigdick"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('hugedick')}>
                        <SceneCustomMarker 
                          icon="hugedick"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>

                      <div onClick={() => handleCustomTags('bigtits')}>
                        <SceneCustomMarker 
                          icon="bigtits"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('hugetits')}>
                        <SceneCustomMarker 
                          icon="hugetits"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item8'>
                    <div style={{ display: "flex", justifyContent: "space-evenly" }}>
                    <div onClick={() => handleCustomTags('bikini')}>
                        <SceneCustomMarker 
                          icon="bikini"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('underwear')}>
                        <SceneCustomMarker 
                          icon="underwear"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('ass')}>
                        <SceneCustomMarker 
                          icon="ass"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('tight')}>
                        <SceneCustomMarker 
                          icon="tight"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                      <div onClick={() => handleCustomTags('interracial')}>
                        <SceneCustomMarker 
                          icon="interracial"
                          paddingTop={""}
                          paddingLeft={""}
                          paddingRight={""}
                          transform={""}
                        />
                      </div>
                    </div>
                  </div>
                  <div className='item9'>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
<div
  onClick={() => handleCustomTags('bj')}
>
<SceneCustomMarker
  icon="bj"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('hj')}
>
<SceneCustomMarker
  icon="hj"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('titjob')}
>
<SceneCustomMarker
  icon="tits"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('cg')}
>
<SceneCustomMarker
  icon="cg"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('rcg')}
>
<SceneCustomMarker
  icon="rcg"
  transform={'scaleX(-1)'}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('doggy')}
>
<SceneCustomMarker
  icon="doggy"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
<div
  onClick={() => handleCustomTags('missionary')}
>
<SceneCustomMarker
  icon="missionary"
  transform={''}
  paddingTop={'1%'}
  paddingLeft={''}
  />
</div>
</div>
                  </div>
                </div>
              </Col>
              <Button
              className="edit-button"
              variant="primary"
              disabled={!customDirty}
              onClick={() => formik.submitForm()}
            >
              <FormattedMessage id="actions.save" />
            </Button>
            </Form.Group>   

            <Form.Group controlId="tags" as={Row}>
              {FormUtils.renderLabel({
                title: intl.formatMessage({ id: "tags" }),
                labelProps: {
                  column: true,
                  sm: 3,
                  xl: 12,
                },
              })}
              <Col sm={9} xl={12}>
                <TagSelect
                  isMulti
                  onSelect={(items) =>
                    formik.setFieldValue(
                      "tag_ids",
                      items.map((item) => item.id)
                    )
                  }
                  ids={formik.values.tag_ids}
                  hoverPlacement="right"
                />
              </Col>
            </Form.Group>
            {formik.values.stash_ids.length ? (
              <Form.Group controlId="stashIDs">
                <Form.Label>
                  <FormattedMessage id="stash_ids" />
                </Form.Label>
                <ul className="pl-0">
                  {formik.values.stash_ids.map((stashID) => {
                    const base =
                      stashID.endpoint.match(/https?:\/\/.*?\//)?.[0];
                    const link = base ? (
                      <a
                        href={`${base}scenes/${stashID.stash_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {stashID.stash_id}
                      </a>
                    ) : (
                      stashID.stash_id
                    );
                    return (
                      <li key={stashID.stash_id} className="row no-gutters">
                        <Button
                          variant="danger"
                          className="mr-2 py-0"
                          title={intl.formatMessage(
                            { id: "actions.delete_entity" },
                            {
                              entityType: intl.formatMessage({
                                id: "stash_id",
                              }),
                            }
                          )}
                          onClick={() => removeStashID(stashID)}
                        >
                          <Icon icon={faTrashAlt} />
                        </Button>
                        {link}
                      </li>
                    );
                  })}
                </ul>
              </Form.Group>
            ) : undefined}
          </div>
          <div className="col-12 col-lg-5 col-xl-12">
            <Form.Group controlId="details">
              <Form.Label>
                <FormattedMessage id="details" />
              </Form.Label>
              <Form.Control
                as="textarea"
                className="scene-description text-input"
                onChange={(e) =>
                  formik.setFieldValue("details", e.currentTarget.value)
                }
                value={formik.values.details ?? ""}
              />
            </Form.Group>
            <div>
              <Form.Group controlId="cover">
                <Form.Label>
                  <FormattedMessage id="cover_image" />
                </Form.Label>
                {image}
                <ImageInput
                  isEditing
                  onImageChange={onCoverImageChange}
                  onImageURL={onImageLoad}
                />
              </Form.Group>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default SceneEditPanel;
