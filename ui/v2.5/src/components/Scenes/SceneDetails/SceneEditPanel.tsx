import React, { useEffect, useState, useMemo, lazy } from "react";
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
  useSceneUpdate,
  mutateReloadScrapers,
  queryScrapeSceneQueryFragment,
  mutateCreateScene,
} from "src/core/StashService";
import {
  PerformerSelect,
  TagSelect,
  StudioSelect,
  GallerySelect,
  Icon,
  LoadingIndicator,
  ImageInput,
  URLField,
} from "src/components/Shared";
import useToast from "src/hooks/Toast";
import { ImageUtils, FormUtils, getStashIDs } from "src/utils";
import { MovieSelect } from "src/components/Shared/Select";
import { useFormik } from "formik";
import { Prompt, useHistory } from "react-router-dom";
import queryString from "query-string";
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
import { SceneCustomMarker } from "./SceneCustomMarker"; 
import { StringIterator } from "lodash";

const SceneScrapeDialog = lazy(() => import("./SceneScrapeDialog"));
const SceneQueryModal = lazy(() => import("./SceneQueryModal"));

interface IProps {
  scene: Partial<GQL.SceneDataFragment>;
  initialCoverImage?: string;
  isNew?: boolean;
  isVisible: boolean;
  onDelete?: () => void;
}

export const SceneEditPanel: React.FC<IProps> = ({
  scene,
  initialCoverImage,
  isNew = false,
  isVisible,
  onDelete,
}) => {
  const intl = useIntl();
  const Toast = useToast();
  const history = useHistory();

  const queryParams = queryString.parse(location.search);

  const fileID = (queryParams?.file_id ?? "") as string;
  const [galleries, setGalleries] = useState<{ id: string; title: string }[]>(
    []
  );

  const Scrapers = useListSceneScrapers();
  const [fragmentScrapers, setFragmentScrapers] = useState<GQL.Scraper[]>([]);
  const [queryableScrapers, setQueryableScrapers] = useState<GQL.Scraper[]>([]);

  const [scraper, setScraper] = useState<GQL.ScraperSourceInput | undefined>();
  const [
    isScraperQueryModalOpen,
    setIsScraperQueryModalOpen,
  ] = useState<boolean>(false);
  const [scrapedScene, setScrapedScene] = useState<GQL.ScrapedScene | null>();
  const [endpoint, setEndpoint] = useState<string | undefined>();

  const [coverImagePreview, setCoverImagePreview] = useState<
    string | undefined
  >();

  useEffect(() => {
    setCoverImagePreview(
      initialCoverImage ?? scene.paths?.screenshot ?? undefined
    );
  }, [scene.paths?.screenshot, initialCoverImage]);

  useEffect(() => {
    setGalleries(
      scene.galleries?.map((g) => ({
        id: g.id,
        title: objectTitle(g),
      })) ?? []
    );
  }, [scene.galleries]);

  const { configuration: stashConfig } = React.useContext(ConfigurationContext);

  // Network state
  const [isLoading, setIsLoading] = useState(false);

  const [updateScene] = useSceneUpdate();

  const [customDirty, setCustomDirty] = useState(false);
  const [makeDirty, setMakeDirty] = useState(false);

  const schema = yup.object({
    title: yup.string().optional().nullable(),
    code: yup.string().optional().nullable(),
    details: yup.string().optional().nullable(),
    director: yup.string().optional().nullable(),
    url: yup.string().optional().nullable(),
    date: yup.string().optional().nullable(),
    rating100: yup.number().optional().nullable(),
    gallery_ids: yup.array(yup.string().required()).optional().nullable(),
    studio_id: yup.string().optional().nullable(),
    performer_ids: yup.array(yup.string().required()).optional().nullable(),
    movies: yup
      .object({
        movie_id: yup.string().required(),
        scene_index: yup.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    tag_ids: yup.array(yup.string().required()).optional().nullable(),
    cover_image: yup.string().optional().nullable(),
    stash_ids: yup.mixed<GQL.StashIdInput>().optional().nullable(),
  });

  const initialValues = useMemo(
    () => ({
      title: scene.title ?? "",
      code: scene.code ?? "",
      details: scene.details ?? "",
      director: scene.director ?? "",
      url: scene.url ?? "",
      date: scene.date ?? "",
      rating100: scene.rating100 ?? null,
      gallery_ids: (scene.galleries ?? []).map((g) => g.id),
      studio_id: scene.studio?.id,
      performer_ids: (scene.performers ?? []).map((p) => p.id),
      movies: (scene.movies ?? []).map((m) => {
        return { movie_id: m.movie.id, scene_index: m.scene_index };
      }),
      tag_ids: (scene.tags ?? []).map((t) => t.id),
      cover_image: initialCoverImage,
      stash_ids: getStashIDs(scene.stash_ids),
    }),
    [scene, initialCoverImage]
  );

  type InputValues = typeof initialValues;

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema: schema,
    onSubmit: (values) => onSave(values),
  });

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

  useEffect(() => {
    if (isVisible) {
      Mousetrap.bind("s s", () => {
        formik.handleSubmit();
      });
      Mousetrap.bind("d d", () => {
        if (onDelete) {
          onDelete();
        }
      });

      // numeric keypresses get caught by jwplayer, so blur the element
      // if the rating sequence is started
      Mousetrap.bind("r", () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        Mousetrap.bind("0", () => setRating(NaN));
        Mousetrap.bind("1", () => setRating(20));
        Mousetrap.bind("2", () => setRating(40));
        Mousetrap.bind("3", () => setRating(60));
        Mousetrap.bind("4", () => setRating(80));
        Mousetrap.bind("5", () => setRating(100));

        setTimeout(() => {
          Mousetrap.unbind("0");
          Mousetrap.unbind("1");
          Mousetrap.unbind("2");
          Mousetrap.unbind("3");
          Mousetrap.unbind("4");
          Mousetrap.unbind("5");
        }, 1000);
      });

      return () => {
        Mousetrap.unbind("s s");
        Mousetrap.unbind("d d");

        Mousetrap.unbind("r");
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

  const imageEncoding = ImageUtils.usePasteImage(onImageLoad, true);

  function getSceneInput(input: InputValues): GQL.SceneUpdateInput {
    return {
      id: scene.id!,
      ...input,
    };
  }

  function setMovieIds(movieIds: string[]) {
    const existingMovies = formik.values.movies;

    const newMovies = movieIds.map((m) => {
      const existing = existingMovies.find((mm) => mm.movie_id === m);
      if (existing) {
        return existing;
      }

      return {
        movie_id: m,
      };
    });

    formik.setFieldValue("movies", newMovies);
  }

  function getCreateValues(values: InputValues): GQL.SceneCreateInput {
    return {
      ...values,
    };
  }

  async function onSave(input: InputValues) {
    setIsLoading(true);
    try {
      if (!isNew) {
        const updateValues = getSceneInput(input);
        const result = await updateScene({
          variables: {
            input: {
              ...updateValues,
              id: scene.id!,
              rating100: input.rating100 ?? null,
            },
          },
        });
        if (result.data?.sceneUpdate) {
          Toast.success({
            content: intl.formatMessage(
              { id: "toast.updated_entity" },
              {
                entity: intl.formatMessage({ id: "scene" }).toLocaleLowerCase(),
              }
            ),
          });
        }
      } else {
        const createValues = getCreateValues(input);
        const result = await mutateCreateScene({
          ...createValues,
          file_ids: fileID ? [fileID as string] : undefined,
        });
        if (result.data?.sceneCreate?.id) {
          history.push(`/scenes/${result.data?.sceneCreate.id}`);
        }
      }

      // clear the cover image so that it doesn't appear dirty
      formik.resetForm({ values: formik.values });
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

  function onImageLoad(imageData: string) {
    setCoverImagePreview(imageData);
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
        url: fragment.url,
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

    const currentScene = getSceneInput(formik.values);
    if (!currentScene.cover_image) {
      currentScene.cover_image = scene.paths!.screenshot;
    }

    return (
      <SceneScrapeDialog
        scene={currentScene}
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

    if (updatedScene.url) {
      formik.setFieldValue("url", updatedScene.url);
    }

    if (updatedScene.studio && updatedScene.studio.stored_id) {
      formik.setFieldValue("studio_id", updatedScene.studio.stored_id);
    }

    if (updatedScene.performers && updatedScene.performers.length > 0) {
      const idPerfs = updatedScene.performers.filter((p) => {
        return p.stored_id !== undefined && p.stored_id !== null;
      });

      if (idPerfs.length > 0) {
        const newIds = idPerfs.map((p) => p.stored_id);
        formik.setFieldValue("performer_ids", newIds as string[]);
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
      setCoverImagePreview(updatedScene.image);
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

  async function onScrapeSceneURL() {
    if (!formik.values.url) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await queryScrapeSceneURL(formik.values.url);
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
      <Form.Group controlId={title} as={Row}>
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
        </Col>
      </Form.Group>
    );
  }

  const image = useMemo(() => {
    if (imageEncoding) {
      return <LoadingIndicator message="Encoding image..." />;
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
  }, [imageEncoding, coverImagePreview, intl]);

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
    }
    formik.setFieldValue("tag_ids", currentIds);
    setMakeDirty(true);
    }

  if (isLoading) return <LoadingIndicator />;

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
              disabled={!isNew && !customDirty}
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
            <Form.Group controlId="url" as={Row}>
              <Col xs={3} className="pr-0 url-label">
                <Form.Label className="col-form-label">
                  <FormattedMessage id="url" />
                </Form.Label>
              </Col>
              <Col xs={9}>
                <URLField
                  {...formik.getFieldProps("url")}
                  onScrapeClick={onScrapeSceneURL}
                  urlScrapable={urlScrapable}
                  isInvalid={!!formik.getFieldMeta("url").error}
                />
              </Col>
            </Form.Group>
            {renderTextField(
              "date",
              intl.formatMessage({ id: "date" }),
              "YYYY-MM-DD"
            )}
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
                  onSelect={(items) =>
                    formik.setFieldValue(
                      "performer_ids",
                      items.map((item) => item.id)
                    )
                  }
                  ids={formik.values.performer_ids}
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
                    </div>
                  </div>
                  <div className='item8'>
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
                    const base = stashID.endpoint.match(
                      /https?:\/\/.*?\//
                    )?.[0];
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
                onChange={(newValue: React.ChangeEvent<HTMLTextAreaElement>) =>
                  formik.setFieldValue("details", newValue.currentTarget.value)
                }
                value={formik.values.details}
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
