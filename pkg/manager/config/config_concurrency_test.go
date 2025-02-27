package config

import (
	"sync"
	"testing"
)

// should be run with -race
func TestConcurrentConfigAccess(t *testing.T) {
	i := GetInstance()

	const workers = 8
	//const loops = 1000
	const loops = 200
	var wg sync.WaitGroup
	for k := 0; k < workers; k++ {
		wg.Add(1)
		go func(wk int) {
			for l := 0; l < loops; l++ {
				if err := i.SetInitialMemoryConfig(); err != nil {
					t.Errorf("Failure setting initial configuration in worker %v iteration %v: %v", wk, l, err)
				}

				i.HasCredentials()
				i.GetCPUProfilePath()
				i.GetConfigFile()
				i.GetConfigPath()
				i.GetDefaultDatabaseFilePath()
				i.GetStashPaths()
				i.GetConfigFilePath()
				i.Set(Cache, i.GetCachePath())
				i.Set(Generated, i.GetGeneratedPath())
				i.Set(Metadata, i.GetMetadataPath())
				i.Set(Database, i.GetDatabasePath())
				i.Set(JWTSignKey, i.GetJWTSignKey())
				i.Set(SessionStoreKey, i.GetSessionStoreKey())
				i.GetDefaultScrapersPath()
				i.Set(Exclude, i.GetExcludes())
				i.Set(ImageExclude, i.GetImageExcludes())
				i.Set(VideoExtensions, i.GetVideoExtensions())
				i.Set(ImageExtensions, i.GetImageExtensions())
				i.Set(GalleryExtensions, i.GetGalleryExtensions())
				i.Set(CreateGalleriesFromFolders, i.GetCreateGalleriesFromFolders())
				i.Set(Language, i.GetLanguage())
				i.Set(VideoFileNamingAlgorithm, i.GetVideoFileNamingAlgorithm())
				i.Set(ScrapersPath, i.GetScrapersPath())
				i.Set(ScraperUserAgent, i.GetScraperUserAgent())
				i.Set(ScraperCDPPath, i.GetScraperCDPPath())
				i.Set(ScraperCertCheck, i.GetScraperCertCheck())
				i.Set(ScraperExcludeTagPatterns, i.GetScraperExcludeTagPatterns())
				i.Set(StashBoxes, i.GetStashBoxes())
				i.GetDefaultPluginsPath()
				i.Set(PluginsPath, i.GetPluginsPath())
				i.Set(Host, i.GetHost())
				i.Set(Port, i.GetPort())
				i.Set(ExternalHost, i.GetExternalHost())
				i.Set(PreviewSegmentDuration, i.GetPreviewSegmentDuration())
				i.Set(ParallelTasks, i.GetParallelTasks())
				i.Set(ParallelTasks, i.GetParallelTasksWithAutoDetection())
				i.Set(PreviewAudio, i.GetPreviewAudio())
				i.Set(PreviewSegments, i.GetPreviewSegments())
				i.Set(PreviewExcludeStart, i.GetPreviewExcludeStart())
				i.Set(PreviewExcludeEnd, i.GetPreviewExcludeEnd())
				i.Set(PreviewPreset, i.GetPreviewPreset())
				i.Set(MaxTranscodeSize, i.GetMaxTranscodeSize())
				i.Set(MaxStreamingTranscodeSize, i.GetMaxStreamingTranscodeSize())
				i.Set(ApiKey, i.GetAPIKey())
				i.Set(Username, i.GetUsername())
				i.Set(Password, i.GetPasswordHash())
				i.GetCredentials()
				i.Set(MaxSessionAge, i.GetMaxSessionAge())
				i.Set(CustomServedFolders, i.GetCustomServedFolders())
				i.Set(CustomUILocation, i.GetCustomUILocation())
				i.Set(MenuItems, i.GetMenuItems())
				i.Set(SoundOnPreview, i.GetSoundOnPreview())
				i.Set(WallShowTitle, i.GetWallShowTitle())
				i.Set(CustomPerformerImageLocation, i.GetCustomPerformerImageLocation())
				i.Set(WallPlayback, i.GetWallPlayback())
				i.Set(MaximumLoopDuration, i.GetMaximumLoopDuration())
				i.Set(AutostartVideo, i.GetAutostartVideo())
				i.Set(ShowStudioAsText, i.GetShowStudioAsText())
				i.Set(SlideshowDelay, i.GetSlideshowDelay())
				i.GetCSSPath()
				i.GetCSS()
				i.Set(CSSEnabled, i.GetCSSEnabled())
				i.Set(HandyKey, i.GetHandyKey())
				i.Set(DLNAServerName, i.GetDLNAServerName())
				i.Set(DLNADefaultEnabled, i.GetDLNADefaultEnabled())
				i.Set(DLNADefaultIPWhitelist, i.GetDLNADefaultIPWhitelist())
				i.Set(DLNAInterfaces, i.GetDLNAInterfaces())
				i.Set(LogFile, i.GetLogFile())
				i.Set(LogOut, i.GetLogOut())
				i.Set(LogLevel, i.GetLogLevel())
				i.Set(LogAccess, i.GetLogAccess())
				i.Set(MaxUploadSize, i.GetMaxUploadSize())
			}
			wg.Done()
		}(k)
	}

	wg.Wait()
}
