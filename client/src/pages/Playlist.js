import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getPlaylistById, getAudioFeaturesForTracks } from '../spotify';
import { catchErrors } from '../utils';
import { TrackList, SectionWrapper } from '../components';
import { StyledHeader } from '../styles';

const Playlist = () => {
    const { id } = useParams();
    const [playlist, setPlaylist] = useState(null);
    const [tracksData, setTracksData] = useState(null);
    const [tracks, setTracks] = useState(null);
    const [audioFeatures, setAudioFeatures] = useState(null);
    const [sortValue, setSortValue] = useState(null);
    const sortOptions = ['danceability', 'tempo', 'energy'];

    // console.log(playlist)
    // {
    //     id:"",
    //     images:"",
    //     owner: "",
    //     tracks: {}
    // }
    //console.log(tracksData) ====>
    // {
    //     "href": "https://api.spotify.com/v1/playlists/6e4izGTsil7TAm0n3vcMsA/tracks?offset=0&limit=100",
    //     "items": [{...track},{...track}{}],
    //     "limit": 100,
    //     "next": null || href//,
    //     "offset": 0 || 100 || 200,
    //     "previous": null,
    //     "total": 7
    // }
    // console.log(tracks);
    // {
    //     "added_at": "2021-05-29T11:50:25Z",
    //     "added_by": {},
    //     "is_local": true,
    //     "primary_color": null,
    //     "track": {album:{}, name:"song1", id:'some id'}
    //     "video_thumbnail": {}
    //}

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await getPlaylistById(id);
            setPlaylist(data);
            setTracksData(data.tracks);
        };

        catchErrors(fetchData());
    }, [id]);

    // When tracksData updates, compile arrays of tracks and audioFeatures
    useEffect(() => {
        if (!tracksData) { // if its  null just return but if something changes in trackData {useEffect,[trackData]} we go to next function => fetchmoreData
            return;
        }

        // When tracksData updates, check if there are more tracks to fetch
        // then update the state variable
        //here we check if tracksData contains next ? if its yes we fetch that data too , and we do it till we will not get next data
        const fetchMoreData = async () => {
            if (tracksData.next) {
                const { data } = await axios.get(tracksData.next);
                setTracksData(data);
            }
        };
        // if tracks is not falsy return tracks and ... tracksData.items else just an [] ... and  tracksData.items
        setTracks(tracks => ([
            ...tracks ? tracks : [],
            ...tracksData.items
        ]));

        catchErrors(fetchMoreData());


        //getting audio features
        const fetchAudioFeatures = async () => {
            const ids = tracksData.items.map(({ track }) => track.id).join(',');
            const { data } = await getAudioFeaturesForTracks(ids);
            setAudioFeatures(audioFeatures => ([
                ...audioFeatures ? audioFeatures : [],
                ...data['audio_features']
            ]));
        };
        catchErrors(fetchAudioFeatures());

    }, [tracksData]);

    //Adding features to the tracks
    const tracksWithAudioFeatures = useMemo(() => {
        if (!tracks || !audioFeatures) {
            return null;
        }

        return tracks.map(({ track }) => {
            const trackToAdd = track;

            if (!track.audio_features) {
                const audioFeaturesObj = audioFeatures.find(item => {
                    if (!item || !track) {
                        return null;
                    }
                    return item.id === track.id;
                });

                trackToAdd['audio_features'] = audioFeaturesObj;
            }

            return trackToAdd;
        });
    }, [tracks, audioFeatures]);

    // Sort tracks by audio feature to be used in template
    const sortedTracks = useMemo(() => {
        if (!tracksWithAudioFeatures) {
            return null;
        }

        return [...tracksWithAudioFeatures].sort((a, b) => {
            const aFeatures = a['audio_features'];
            const bFeatures = b['audio_features'];

            if (!aFeatures || !bFeatures) {
                return false;
            }

            return bFeatures[sortValue] - aFeatures[sortValue];
        });
    }, [sortValue, tracksWithAudioFeatures]);


    return (
        <>
            {playlist && (
                <>
                    <StyledHeader>
                        <div className="header__inner">
                            {playlist.images.length && playlist.images[0].url && (
                                <img className="header__img" src={playlist.images[0].url} alt="Playlist Artwork"/>
                            )}
                            <div>
                                <div className="header__overline">Playlist</div>
                                <h1 className="header__name">{playlist.name}</h1>
                                <p className="header__meta">
                                    {playlist.followers.total ? (
                                        <span>{playlist.followers.total} {`follower${playlist.followers.total !== 1 ? 's' : ''}`}</span>
                                    ) : null}
                                    <span>{playlist.tracks.total} {`song${playlist.tracks.total !== 1 ? 's' : ''}`}</span>
                                </p>
                            </div>
                        </div>
                    </StyledHeader>

                    <main>
                        <SectionWrapper title="Playlist" breadcrumb={true}>
                            <div>
                                <label className="sr-only" htmlFor="order-select">
                                    Sort tracks
                                </label>
                                <select
                                    name="track-order"
                                    id="order-select"
                                    onChange={e=>setSortValue(e.target.value)}
                                >
                                    <option value=" ">Sort tracks</option>
                                    {sortOptions.map((option,i)=>(
                                        <option value={option} key={i}>
                                            {
                                                `${option.charAt(0).toUpperCase()}${option.slice(1)}`
                                            }
                                        </option>
                                    ))}
                                    
                                </select>
                            </div>
                            {sortedTracks && (
                                <TrackList tracks={sortedTracks} />
                            )}
                        </SectionWrapper>
                    </main>
                </>
            )}
        </>
    )
}

export default Playlist;